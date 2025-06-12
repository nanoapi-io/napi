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
import { ApiService } from "../../../apiService/index.ts";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import type { DependencyManifest } from "../../../manifest/dependencyManifest/types.ts";
import { isAuthenticatedMiddleware } from "../../middlewares/isAuthenticated.ts";

// Type for the symbol option

function builderFunction(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .middleware(isAuthenticatedMiddleware)
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
      description: "The manifest ID to use for the extraction",
      requiresArg: true,
      demandOption: true,
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
      },
    );
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    symbol: string[];
    manifestId: string;
  },
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;
  const start = Date.now();

  console.info("🎯 Starting symbol extraction...");

  try {
    console.info(`📄 Fetching manifest from API (ID: ${argv.manifestId})...`);

    // Create API service instance
    const apiService = new ApiService(
      globalConfig.apiHost,
      globalConfig.jwt,
      undefined,
    );

    // Fetch manifest from API
    const response = await apiService.performRequest(
      "GET",
      `/manifests/${argv.manifestId}`,
    );

    if (response.status !== 200) {
      console.error("❌ Failed to fetch manifest from API");
      console.error(`   Status: ${response.status}`);
      try {
        const errorBody = await response.json();
        if (errorBody.error) {
          console.error(`   Error: ${errorBody.error}`);
        }
      } catch {
        // Ignore JSON parsing errors
      }
      console.error("");
      console.error("💡 Common solutions:");
      console.error("   • Check that the manifest ID is correct");
      console.error("   • Verify the project exists and you have access");
      Deno.exit(1);
    }

    const responseData = await response.json() as {
      manifest: DependencyManifest;
    };
    const dependencyManifest = responseData.manifest;

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
      "   • Ensure the manifest is up to date: napi manifest generate",
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
