import Parser from "tree-sitter";
import { DependencyManifesto, FileManifesto, SymbolType } from "..";
import { PythonExportResolver } from "../../../languagePlugins/python/exportResolver";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonModuleMapper } from "../../../languagePlugins/python/moduleMapper";
import { PythonImportResolver } from "../../../languagePlugins/python/importResolver";
import { PythonUsageResolver } from "../../../languagePlugins/python/usageResolver";
import { PythonDependencyResolver } from "../../../languagePlugins/python/dependencyResolver";

function generateDependentsForManifesto(
  manifesto: DependencyManifesto,
): DependencyManifesto {
  // Go through each file in the manifesto
  for (const [fileId, fileManifest] of Object.entries(manifesto)) {
    // For each symbol in the file
    for (const [symbolId, symbolData] of Object.entries(fileManifest.symbols)) {
      // For each dependency that this symbol uses
      for (const [depFileId, depInfo] of Object.entries(
        symbolData.dependencies,
      )) {
        // Only proceed if it's an internal dependency and the target file actually exists in our manifesto
        if (!depInfo.isExternal && manifesto[depFileId]) {
          const depFile = manifesto[depFileId];

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

  return manifesto;
}

export function generatePythonDependencyManifesto(
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
): DependencyManifesto {
  const parser = pythonParser;

  const exportResolver = new PythonExportResolver(parser, files);
  const moduleMapper = new PythonModuleMapper(files, exportResolver);
  const importResolver = new PythonImportResolver(
    parser,
    files,
    moduleMapper,
    exportResolver,
  );
  const usageResolver = new PythonUsageResolver(parser);
  const dependencyResolver = new PythonDependencyResolver(
    parser,
    files,
    exportResolver,
    importResolver,
    usageResolver,
  );

  let manifesto: DependencyManifesto = {};

  for (const [, { path }] of files) {
    const fileDependencies = dependencyResolver.getFileDependencies(path);
    const fileManifesto: FileManifesto = {
      id: path,
      filePath: path,
      characterCount: fileDependencies.characterCount,
      lineCount: fileDependencies.lineCount,
      language: parser.getLanguage().name,
      dependencies: {},
      symbols: {},
    };

    for (const [depId, dep] of fileDependencies.dependencies) {
      fileManifesto.dependencies[depId] = {
        id: dep.id,
        isExternal: dep.isExternal,
        symbols: Object.fromEntries(dep.symbols),
      };
    }

    for (const symbol of fileDependencies.symbols) {
      fileManifesto.symbols[symbol.id] = {
        id: symbol.id,
        characterCount: symbol.characterCount,
        lineCount: symbol.lineCount,
        type: symbol.type as SymbolType, // TODO handle this better
        dependencies: {},
        dependents: {},
      };

      for (const [depId, dep] of symbol.dependencies) {
        fileManifesto.symbols[symbol.id].dependencies[depId] = {
          id: dep.id,
          isExternal: dep.isExternal,
          symbols: Object.fromEntries(dep.symbols),
        };
      }
    }

    manifesto[path] = fileManifesto;
  }

  manifesto = generateDependentsForManifesto(manifesto);

  return manifesto;
}
