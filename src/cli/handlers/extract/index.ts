import type { Arguments } from "yargs-types";
import type { localConfigSchema } from "../../middlewares/napiConfig.ts";

import type { z } from "zod";
import { extractSymbols } from "../../../symbolExtractor/index.ts";
import {
  getExtensionsForLanguage,
  getFilesFromDirectory,
  writeFilesToDirectory,
} from "../../../helpers/fileSystem/index.ts";
import { join } from "@std/path";
import { napiConfigMiddleware } from "../../middlewares/napiConfig.ts";
import type { DependencyManifest } from "../../../manifest/dependencyManifest/types.ts";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";

const NAPI_DIR = ".napi";
const MANIFESTS_DIR = "manifests";

interface ManifestEnvelope {
  id: string;
  branch: string;
  commitSha: string;
  commitShaDate: string;
  createdAt: string;
  manifest: DependencyManifest;
}

function getLatestManifestId(workdir: string): string | null {
  const manifestsDir = join(workdir, NAPI_DIR, MANIFESTS_DIR);
  try {
    const entries: { name: string }[] = [];
    for (const entry of Deno.readDirSync(manifestsDir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        entries.push(entry);
      }
    }
    if (entries.length === 0) return null;
    entries.sort((a, b) => b.name.localeCompare(a.name));
    return entries[0].name.replace(".json", "");
  } catch {
    return null;
  }
}

function loadManifest(workdir: string, manifestId: string): ManifestEnvelope {
  const manifestPath = join(
    workdir,
    NAPI_DIR,
    MANIFESTS_DIR,
    `${manifestId}.json`,
  );
  const content = Deno.readTextFileSync(manifestPath);
  return JSON.parse(content) as ManifestEnvelope;
}

function builderFunction(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .option("symbol", {
      type: "array" as const,
      description:
        "Symbols to extract (format: file|symbol where file is absolute path from .napirc and symbol is the symbol name)",
      string: true,
      requiresArg: true,
      demandOption: true,
    })
    .option("manifestId", {
      type: "string",
      description:
        "The manifest ID to use for the extraction (defaults to latest)",
      requiresArg: true,
    })
    .check(
      (
        argv: Arguments & {
          globalConfig: z.infer<typeof globalConfigSchema>;
        } & {
          symbol: string[];
        },
      ) => {
        const symbols = argv.symbol;

        if (!symbols || symbols.length === 0) {
          throw new Error("At least one symbol must be specified");
        }

        for (const symbolSpec of symbols) {
          const splitSymbol = symbolSpec.split("|");
          if (splitSymbol.length !== 2) {
            throw new Error(
              `Invalid symbol format: "${symbolSpec}". Expected format: file|symbol (e.g., "src/main.py|myFunction")`,
            );
          }
        }

        return true;
      },
    );
}

function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    symbol: string[];
    manifestId?: string;
  },
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;
  const start = Date.now();

  console.info("🎯 Starting symbol extraction...");

  try {
    let manifestId = argv.manifestId;

    if (!manifestId) {
      manifestId = getLatestManifestId(argv.workdir) ?? undefined;
      if (!manifestId) {
        console.error("❌ No manifests found in .napi/manifests/");
        console.error("   Run 'napi generate' first to create a manifest.");
        Deno.exit(1);
      }
      console.info(`📄 Using latest manifest: ${manifestId}`);
    } else {
      console.info(`📄 Using manifest: ${manifestId}`);
    }

    let envelope: ManifestEnvelope;
    try {
      envelope = loadManifest(argv.workdir, manifestId);
    } catch (error) {
      console.error(`❌ Failed to load manifest: ${manifestId}`);
      if (error instanceof Deno.errors.NotFound) {
        console.error(
          `   File not found: .napi/manifests/${manifestId}.json`,
        );
      } else {
        console.error(
          `   Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      Deno.exit(1);
    }

    const dependencyManifest = envelope.manifest;

    console.info("🔍 Validating symbol specifications...");
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();

    for (const symbolSpec of argv.symbol) {
      const [filePath, symbolName] = symbolSpec.split("|", 2);

      if (!dependencyManifest[filePath]) {
        console.warn(`⚠️  File not found in manifest: ${filePath}`);
        console.warn(
          "   Make sure the file is included in your project configuration",
        );
      }

      const existingEntry = symbolsToExtract.get(filePath) || {
        filePath,
        symbols: new Set<string>(),
      };

      existingEntry.symbols.add(symbolName);
      symbolsToExtract.set(filePath, existingEntry);
    }

    console.info(
      `📊 Extracting ${argv.symbol.length} symbols from ${symbolsToExtract.size} files:`,
    );
    for (const [filePath, { symbols }] of symbolsToExtract) {
      console.info(`   • ${filePath}: ${Array.from(symbols).join(", ")}`);
    }

    console.info("🔧 Scanning project files...");
    const fileExtensions = getExtensionsForLanguage(napiConfig.language);

    const files = getFilesFromDirectory(argv.workdir, {
      includes: napiConfig.project.include,
      excludes: napiConfig.project.exclude,
      extensions: fileExtensions,
      logMessages: false,
    });

    console.info(`📁 Found ${files.size} files to process`);
    console.info("⚙️  Extracting symbols...");

    const extractedFiles = extractSymbols(
      files,
      dependencyManifest,
      symbolsToExtract,
      napiConfig,
    );

    const unixTimestamp = Date.now();
    const outputDir = join(
      argv.workdir,
      napiConfig.outDir,
      `extracted-${unixTimestamp}`,
    );

    console.info(`💾 Writing extracted symbols to: ${outputDir}`);
    writeFilesToDirectory(extractedFiles, outputDir);

    const duration = Date.now() - start;
    console.info(
      `✅ Symbol extraction completed successfully in ${duration}ms`,
    );
    console.info(`📄 Extracted files:`);
    console.info(`   • ${extractedFiles.size} files generated`);
    console.info(`   • Output directory: ${outputDir}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Symbol extraction failed");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error(
      "   • Check your symbol specifications (format: file|symbol)",
    );
    console.error(
      "   • Ensure the manifest is up to date: napi generate",
    );
    console.error(
      "   • Verify the specified files contain the requested symbols",
    );

    Deno.exit(1);
  }
}

export default {
  command: "extract",
  describe: "extract symbols from your program",
  builder: builderFunction,
  handler,
};
