import Parser from "tree-sitter";
import {
  DependencyManifest,
  FileDependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
  SymbolDependencyManifest,
  DependencyInfo,
} from "@napi/shared";
import { PythonExportExtractor } from "../../../languagePlugins/python/exportExtractor/index.js";
import { pythonParser } from "../../../helpers/treeSitter/parsers.js";
import { PythonModuleResolver } from "../../../languagePlugins/python/moduleResolver/index.js";
import { PythonUsageResolver } from "../../../languagePlugins/python/usageResolver/index.js";
import { PythonDependencyResolver } from "../../../languagePlugins/python/dependencyResolver/index.js";
import { PythonItemResolver } from "../../../languagePlugins/python/itemResolver/index.js";
import { PythonImportExtractor } from "../../../languagePlugins/python/importExtractor/index.js";
import { localConfigSchema } from "../../../config/localConfig.js";
import z from "zod";
import { PythonMetricsAnalyzer } from "../../../languagePlugins/python/metricAnalyzer/index.js";

function generateDependentsForManifest(
  manifest: DependencyManifest,
): DependencyManifest {
  // Go through each file in the manifest
  for (const [fileId, fileManifest] of Object.entries(manifest)) {
    // Process file-level dependencies first
    for (const [depFileId, depInfo] of Object.entries(
      fileManifest.dependencies,
    )) {
      // Only proceed if it's an internal dependency and the target file actually exists in our manifest
      if (!depInfo.isExternal && manifest[depFileId]) {
        const depFile = manifest[depFileId];

        // Add file-level dependent relationship
        if (!depFile.dependents[fileId]) {
          depFile.dependents[fileId] = {
            id: fileId,
            symbols: {},
          };
        }

        // For each symbol name that we reference from the dependency at file level
        for (const usedSymbolName of Object.keys(depInfo.symbols)) {
          // Check if that symbol actually exists in the target file
          if (depFile.symbols[usedSymbolName]) {
            const targetSymbol = depFile.symbols[usedSymbolName];

            // Ensure there's a record for the dependent file
            if (!targetSymbol.dependents[fileId]) {
              targetSymbol.dependents[fileId] = {
                id: fileId,
                symbols: {},
              };
            }

            // Record that the file as a whole depends on 'usedSymbolName' in depFile
            depFile.dependents[fileId].symbols[usedSymbolName] = usedSymbolName;
          }
        }
      }
    }

    // For each symbol in the file
    for (const [symbolId, symbolData] of Object.entries(fileManifest.symbols)) {
      // For each dependency that this symbol uses
      for (const [depFileId, depInfo] of Object.entries(
        symbolData.dependencies,
      )) {
        // Only proceed if it's an internal dependency and the target file actually exists in our manifest
        if (!depInfo.isExternal && manifest[depFileId]) {
          const depFile = manifest[depFileId];

          // Add file-level dependent relationship
          if (!depFile.dependents[fileId]) {
            depFile.dependents[fileId] = {
              id: fileId,
              symbols: {},
            };
          }

          // For each symbol name that we reference from the dependency
          for (const usedSymbolName of Object.keys(depInfo.symbols)) {
            // Check if that symbol actually exists in the target file
            if (depFile.symbols[usedSymbolName]) {
              const targetSymbol = depFile.symbols[usedSymbolName];

              // Ensure there's a record for the dependent file
              if (!targetSymbol.dependents[fileId]) {
                targetSymbol.dependents[fileId] = {
                  id: fileId,
                  symbols: {},
                };
              }

              // Record that 'symbolId' in this file depends on 'usedSymbolName' in depFile
              targetSymbol.dependents[fileId].symbols[symbolId] = symbolId;

              // Update the file-level dependents with this symbol relationship
              depFile.dependents[fileId].symbols[symbolId] = symbolId;
            }
          }
        }
      }
    }
  }

  // Update dependency and dependent counts in metrics
  for (const fileManifest of Object.values(manifest)) {
    // Update file-level metrics
    fileManifest.metrics[metricDependencyCount] = Object.keys(
      fileManifest.dependencies,
    ).length;
    fileManifest.metrics[metricDependentCount] = Object.keys(
      fileManifest.dependents,
    ).length;

    // Update symbol-level metrics
    for (const symbolData of Object.values(fileManifest.symbols)) {
      symbolData.metrics[metricDependencyCount] = Object.keys(
        symbolData.dependencies,
      ).length;
      symbolData.metrics[metricDependentCount] = Object.keys(
        symbolData.dependents,
      ).length;
    }
  }

  return manifest;
}

export function generatePythonDependencyManifest(
  files: Map<string, { path: string; content: string }>,
  napiConfig: z.infer<typeof localConfigSchema>,
): DependencyManifest {
  const parsedFiles = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();

  for (const [filePath, { content: fileContent }] of files) {
    try {
      const rootNode = pythonParser.parse(fileContent, undefined, {
        bufferSize: fileContent.length + 10,
      }).rootNode;
      parsedFiles.set(filePath, { path: filePath, rootNode });
    } catch (e) {
      console.error(`Failed to parse ${filePath}, skipping`);
      console.error(e);
    }
  }

  console.time("generatePythonDependencyManifest");

  const parser = pythonParser;

  const pythonVersion = napiConfig.python?.version;
  if (!pythonVersion) {
    throw new Error(
      "Python version is required in the .napirc file (audit.pythonVersion).",
    );
  }

  console.time("generatePythonDependencyManifest:initialization");
  console.info("Initializing Python export resolver...");
  const exportExtractor = new PythonExportExtractor(parser, parsedFiles);
  console.info("Initializing Python import resolver...");
  const importExtractor = new PythonImportExtractor(parser, parsedFiles);
  console.info("Initializing Python module resolver...");

  const moduleResolver = new PythonModuleResolver(
    new Set(parsedFiles.keys()),
    pythonVersion,
  );
  console.info("Initializing Python item resolver...");
  const itemResolver = new PythonItemResolver(
    exportExtractor,
    importExtractor,
    moduleResolver,
  );
  console.info("Initializing Python usage resolver...");
  const usageResolver = new PythonUsageResolver(parser, exportExtractor);
  console.info("Initializing Python dependency resolver...");
  const complexityAnalyzer = new PythonMetricsAnalyzer(parser);
  const dependencyResolver = new PythonDependencyResolver(
    parsedFiles,
    exportExtractor,
    importExtractor,
    itemResolver,
    usageResolver,
    moduleResolver,
    complexityAnalyzer,
  );

  console.timeEnd("generatePythonDependencyManifest:initialization");

  console.time("generatePythonDependencyManifest:processing");
  console.info("Generating Python dependency manifest...");
  let manifest: DependencyManifest = {};

  for (const [i, file] of files.entries()) {
    const fileDependencies = dependencyResolver.getFileDependencies(file.path);
    if (!fileDependencies) {
      throw new Error(
        `File dependencies not found for ${file.path}. This is a bug. Please report it.`,
      );
    }

    const dependencies: Record<string, DependencyInfo> = {};
    for (const [depId, dep] of fileDependencies.dependencies) {
      const symbols: Record<string, string> = {};
      for (const symbolName of Object.keys(dep.symbols)) {
        symbols[symbolName] = symbolName;
      }

      dependencies[depId] = {
        id: dep.id,
        isExternal: dep.isExternal,
        symbols,
      };
    }

    const symbols: Record<string, SymbolDependencyManifest> = {};
    for (const symbol of fileDependencies.symbols) {
      const dependencies: Record<string, DependencyInfo> = {};
      for (const depSymbol of Object.values(symbol.dependencies)) {
        const symbols: Record<string, string> = {};
        for (const depSymbolName of Object.keys(depSymbol.symbols)) {
          symbol[depSymbolName] = depSymbol.symbols[depSymbolName];
        }

        dependencies[depSymbol.id] = {
          id: depSymbol.id,
          isExternal: depSymbol.isExternal,
          symbols,
        };
      }

      for (const [depId, dep] of symbol.dependencies) {
        dependencies[depId] = {
          id: dep.id,
          isExternal: dep.isExternal,
          symbols: {},
        };
      }

      symbols[symbol.id] = {
        id: symbol.id,
        type: symbol.type,
        metrics: {
          [metricLinesCount]: symbol.metrics.linesCount,
          [metricCodeLineCount]: symbol.metrics.codeLineCount,
          [metricCharacterCount]: symbol.metrics.characterCount,
          [metricCodeCharacterCount]: symbol.metrics.codeCharacterCount,
          [metricDependencyCount]: symbol.dependencies.size,
          [metricDependentCount]: 0, // Will be computed later
          [metricCyclomaticComplexity]: symbol.metrics.cyclomaticComplexity,
        },
        dependencies,
        dependents: {}, // Will be computed later
      };
    }

    const fileManifest: FileDependencyManifest = {
      id: file.path,
      filePath: file.path,
      metrics: {
        [metricLinesCount]: fileDependencies.metrics.codeLineCount,
        [metricCodeLineCount]: fileDependencies.metrics.codeLineCount,
        [metricCharacterCount]: fileDependencies.metrics.characterCount,
        [metricCodeCharacterCount]: fileDependencies.metrics.codeCharacterCount,
        [metricDependencyCount]: Object.keys(fileDependencies.dependencies)
          .length,
        [metricDependentCount]: 0, // Will be computed later
        [metricCyclomaticComplexity]:
          fileDependencies.metrics.cyclomaticComplexity,
      },
      language: parser.getLanguage().name,
      dependencies,
      dependents: {}, // Will be computed later
      symbols,
    };

    manifest[file.path] = fileManifest;

    console.info(`✅ Processed file ${i + 1}/${files.size}: ${file.path}`);
  }

  console.info(
    `Generated Python dependency manifest for ${parsedFiles.size} files`,
  );

  console.timeEnd("generatePythonDependencyManifest:processing");

  console.time("generatePythonDependencyManifest:dependents");
  console.info("Generating Python dependents...");
  manifest = generateDependentsForManifest(manifest);
  console.info("Generated Python dependents");
  console.timeEnd("generatePythonDependencyManifest:dependents");

  console.info("Python dependency manifest generated");

  console.timeEnd("generatePythonDependencyManifest");

  return manifest;
}
