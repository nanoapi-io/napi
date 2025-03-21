import Parser from "tree-sitter";
import { DependencyManifesto, FileManifesto, SymbolType } from "..";
import { CSharpPlugin } from "../../../languagePlugins/csharp/csharpParser";
import { Namespace } from "../../../languagePlugins/csharp/csharpParser/types";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

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

// TODO : Manage external dependencies
export function generateCSharpDependencyManifesto(
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
): DependencyManifesto {
  const plugin: CSharpPlugin = new CSharpPlugin(files);
  let manifesto: DependencyManifesto = {};

  const tree: Namespace = plugin.buildNamespaceTree();

  for (const [, f] of files) {
    const fileDependencies = plugin.getDependenciesFromFile(tree, f);
    const fileNamespaces = plugin.getNamespacesFromFile(f);
    const exportedSymbols = plugin.getClassesFromNamespaces(fileNamespaces);
    const fileManifest: FileManifesto = {
      id: f.path,
      filePath: f.path,
      characterCount: f.rootNode.endIndex,
      lineCount: f.rootNode.endPosition.row,
      language: csharpParser.getLanguage().name,
      symbols: {},
      dependencies: {},
    };

    for (const dep of fileDependencies) {
      const dependencyKey = dep.namespace
        ? dep.namespace + "." + dep.name
        : dep.name;
      fileManifest.dependencies[dependencyKey] = {
        id: dep.filepath,
        isExternal: false,
        symbols: {},
      };
    }

    for (const symbol of exportedSymbols) {
      fileManifest.symbols[symbol.name] = {
        id: symbol.name,
        characterCount: symbol.node.endIndex - symbol.node.startIndex,
        lineCount: symbol.node.endPosition.row - symbol.node.startPosition.row,
        type: symbol.type as SymbolType,
        dependencies: {},
        dependents: {},
      };

      const symbolDep = plugin.getDependenciesFromNode(tree, symbol.node);
      for (const dep of symbolDep) {
        const depFile = files.get(dep.filepath);
        if (depFile) {
          fileManifest.symbols[symbol.name].dependencies[dep.filepath] = {
            id: dep.filepath,
            isExternal: false,
            symbols: Object.fromEntries(
              plugin
                .getClassesFromNamespaces(plugin.getNamespacesFromFile(depFile))
                .map((s) => [s.name, s.name]),
            ),
          };
        }
      }
    }
    manifesto[f.path] = fileManifest;
  }
  manifesto = generateDependentsForManifesto(manifesto);
  return manifesto;
}
