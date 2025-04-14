import Parser from "tree-sitter";
import { DependencyManifest, FileManifest } from "..";
import { PythonExportExtractor } from "../../../languagePlugins/python/exportExtractor";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonModuleResolver } from "../../../languagePlugins/python/moduleResolver";
import { PythonUsageResolver } from "../../../languagePlugins/python/usageResolver";
import { PythonDependencyResolver } from "../../../languagePlugins/python/dependencyResolver";
import { PythonItemResolver } from "../../../languagePlugins/python/itemResolver";
import { PythonImportExtractor } from "../../../languagePlugins/python/importExtractor";
import { localConfigSchema } from "../../../config/localConfig";
import z from "zod";

function generateDependentsForManifest(
  manifest: DependencyManifest,
): DependencyManifest {
  // Go through each file in the manifest
  for (const [fileId, fileManifest] of Object.entries(manifest)) {
    // For each symbol in the file
    for (const [symbolId, symbolData] of Object.entries(fileManifest.symbols)) {
      // For each dependency that this symbol uses
      for (const [depFileId, depInfo] of Object.entries(
        symbolData.dependencies,
      )) {
        // Only proceed if it's an internal dependency and the target file actually exists in our manifest
        if (!depInfo.isExternal && manifest[depFileId]) {
          const depFile = manifest[depFileId];

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
            }
            // else: If you want special handling when the target symbol doesn't exist, do it here.
          }
        }
      }
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

  const pythonVersion = napiConfig.audit?.pythonVersion;
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

  const moduleResolver = new PythonModuleResolver(parsedFiles, pythonVersion);
  console.info("Initializing Python item resolver...");
  const itemResolver = new PythonItemResolver(
    exportExtractor,
    importExtractor,
    moduleResolver,
  );
  console.info("Initializing Python usage resolver...");
  const usageResolver = new PythonUsageResolver(parser, exportExtractor);
  console.info("Initializing Python dependency resolver...");
  const dependencyResolver = new PythonDependencyResolver(
    parsedFiles,
    exportExtractor,
    importExtractor,
    itemResolver,
    usageResolver,
    moduleResolver,
  );

  console.timeEnd("generatePythonDependencyManifest:initialization");

  console.time("generatePythonDependencyManifest:processing");
  console.info("Generating Python dependency manifest...");
  let manifest: DependencyManifest = {};

  let i = 0;
  for (const [, { path }] of files) {
    i++;
    console.info(`Processing file ${i}/${files.size}: ${path}`);

    const fileDependencies = dependencyResolver.getFileDependencies(path);
    if (!fileDependencies) {
      throw new Error(
        `File dependencies not found for ${path}. This is a bug. Please report it.`,
      );
    }
    const fileManifest: FileManifest = {
      id: path,
      filePath: path,
      characterCount: fileDependencies.metrics.characterCount,
      lineCount: fileDependencies.metrics.lineCount,
      language: parser.getLanguage().name,
      dependencies: {},
      symbols: {},
    };

    for (const [depId, dep] of fileDependencies.dependencies) {
      fileManifest.dependencies[depId] = {
        id: dep.id,
        isExternal: dep.isExternal,
        symbols: {},
      };
      for (const symbol of dep.symbols) {
        fileManifest.dependencies[depId].symbols[symbol] = symbol;
      }
    }

    for (const symbol of fileDependencies.symbols) {
      fileManifest.symbols[symbol.id] = {
        id: symbol.id,
        characterCount: symbol.metrics.characterCount,
        lineCount: symbol.metrics.lineCount,
        type: symbol.type,
        dependencies: {},
        dependents: {},
      };

      for (const [depId, dep] of symbol.dependencies) {
        fileManifest.symbols[symbol.id].dependencies[depId] = {
          id: dep.id,
          isExternal: dep.isExternal,
          symbols: {},
        };
        for (const depSymbol of dep.symbols) {
          fileManifest.symbols[symbol.id].dependencies[depId].symbols[
            depSymbol
          ] = depSymbol;
        }
      }
    }

    manifest[path] = fileManifest;
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
