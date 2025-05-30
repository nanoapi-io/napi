import type { ArgumentsCamelCase, Argv, InferredOptionTypes } from "npm:yargs";
import type { globalOptions } from "../../index.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import type { localConfigSchema } from "../../../config/localConfig.ts";
import {
  dependencyManifestExists,
  getDependencyManifest,
  getDependencyManifestPath,
} from "../../../manifest/dependencyManifest/index.ts";
import type { z } from "zod";
import { extractSymbols } from "../../../symbolExtractor/index.ts";
import {
  getExtensionsForLanguage,
  getFilesFromDirectory,
  writeFilesToDirectory,
} from "../../../helpers/fileSystem/index.ts";
import { join } from "@std/path";
import { napiConfigMiddleware } from "../../middlewares/napiConfig.ts";

// Type for the symbol option
const extractOptions = {
  symbol: {
    type: "array" as const,
    description:
      "Symbols to extract (format: file|symbol where file is absolute path from .napirc and symbol is the symbol name)",
    string: true,
    requiresArg: true,
    demandOption: true,
  },
} as const;

function builderFunction(
  yargs: Argv<InferredOptionTypes<typeof globalOptions>>,
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .option("symbol", extractOptions.symbol)
    .check((argv) => {
      const symbols = argv.symbol;

      if (!symbols || symbols.length === 0) {
        throw new Error("At least one symbol must be specified");
      }

      // Validate each symbol format
      for (const symbolSpec of symbols) {
        const splitSymbol = symbolSpec.split("|");
        if (splitSymbol.length !== 2) {
          throw new Error(
            `Invalid symbol format: "${symbolSpec}". Expected format: file|symbol (e.g., "src/main.py|myFunction")`,
          );
        }
      }

      return true;
    });
}

function handler(
  argv: ArgumentsCamelCase<
    InferredOptionTypes<typeof globalOptions> & {
      symbol: string[];
    }
  >,
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;
  const start = Date.now();

  console.info("🎯 Starting symbol extraction...");

  trackEvent(TelemetryEvents.CLI_EXTRACT_COMMAND, {
    message: "`napi extract` command started",
  });

  try {
    const manifestPath = getDependencyManifestPath(argv.workdir, napiConfig);
    const manifestExists = dependencyManifestExists(argv.workdir, napiConfig);

    if (!manifestExists) {
      console.error("❌ No dependency manifest found");
      console.error(`   Looking for: ${manifestPath}`);
      console.error("");
      console.error("💡 To generate a manifest:");
      console.error("   1. Run: napi manifest generate");
      console.error("   2. Then try your extract command again");
      Deno.exit(1);
    }

    console.info(`📄 Loading manifest from: ${manifestPath}`);
    const dependencyManifest = getDependencyManifest(argv.workdir, napiConfig);

    console.info("🔍 Validating symbol specifications...");
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();

    for (const symbolSpec of argv.symbol) {
      const [filePath, symbolName] = symbolSpec.split("|", 2);

      // Check if the file exists in the manifest
      if (!dependencyManifest[filePath]) {
        console.warn(`⚠️  File not found in manifest: ${filePath}`);
        console.warn(
          "   Make sure the file is included in your project configuration",
        );
      }

      // Get existing entry or create new one
      const existingEntry = symbolsToExtract.get(filePath) || {
        filePath,
        symbols: new Set<string>(),
      };

      // Add the symbol to the set
      existingEntry.symbols.add(symbolName);

      // Set/update the entry
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
      logMessages: false, // We'll handle our own logging
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

    trackEvent(TelemetryEvents.CLI_EXTRACT_COMMAND, {
      message: "`napi extract` command finished",
      duration: duration,
    });
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Symbol extraction failed");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error(
      "   • Check your symbol specifications (format: file|symbol)",
    );
    console.error(
      "   • Ensure the manifest is up to date: napi manifest generate",
    );
    console.error(
      "   • Verify the specified files contain the requested symbols",
    );

    trackEvent(TelemetryEvents.CLI_EXTRACT_COMMAND, {
      message: "`napi extract` command failed",
      duration: duration,
      error: errorMessage,
    });

    Deno.exit(1);
  }
}

export default {
  command: "extract",
  describe: "extract symbols from your program",
  builder: builderFunction,
  handler,
};
