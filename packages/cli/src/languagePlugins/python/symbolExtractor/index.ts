import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { removeIndexesFromSourceCode } from "../../../helpers/sourceCode";
import { FileDependencies } from "../dependencyResolver/types";
import {
  PYTHON_PACKAGE_MODULE_TYPE,
  PythonModule,
} from "../moduleResolver/types";
import { PythonSymbol } from "../exportExtractor/types";
import { SymbolToKeepMap } from "./types";

export class PythonSymbolExtractor {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private exportExtractor: PythonExportExtractor;
  private moduleResolver: PythonModuleResolver;
  private dependencyMap: Map<string, FileDependencies>;
  private parser: Parser;
  private removeErrorQuery: Parser.Query;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportExtractor: PythonExportExtractor,
    moduleResolver: PythonModuleResolver,
    dependencyMap: Map<string, FileDependencies>,
    parser: Parser,
  ) {
    this.files = files;
    this.exportExtractor = exportExtractor;
    this.moduleResolver = moduleResolver;
    this.dependencyMap = dependencyMap;
    this.parser = parser;
    this.removeErrorQuery = new Parser.Query(
      this.parser.getLanguage(),
      "(ERROR) @error",
    );
  }

  private getSymbolsToKeep(
    symbols: {
      name: string;
      type: string;
      filePath: string;
    }[],
  ) {
    // Track files to extract and their required symbols
    const filesToExtract = new Map<string, Set<string>>();

    // Process each requested symbol
    for (const symbolInfo of symbols) {
      const { name, type, filePath } = symbolInfo;

      // check if the file exists
      const file = this.files.get(filePath);
      if (!file) {
        throw new Error(`File ${filePath} not found in files map`);
      }
      // check if the symbol exists
      const symbol = this.exportExtractor
        .getSymbols(filePath)
        .symbols.find((s) => s.id === name && s.type === type);
      if (!symbol) {
        throw new Error(`Symbol ${name} not found in file ${filePath}`);
      }

      // Add the original symbol
      this.addSymbolToExtract(filePath, name, filesToExtract);

      if (!symbol) {
        console.warn(`Symbol ${name} not found in ${filePath}`);
        continue;
      }

      // Include necessary __init__.py files
      const module = this.moduleResolver.getModuleFromFilePath(filePath);
      if (module) {
        this.includeInitFiles(module, filesToExtract);
      }

      // Recursively collect all symbol dependencies
      const visited = new Set<string>();
      this.collectDependenciesRecursively(
        filePath,
        symbol,
        filesToExtract,
        visited,
      );
    }

    // Filter out invalid files (those that were deleted)
    const validFiles = new Map<string, Set<string>>();
    filesToExtract.forEach((symbolSet, path) => {
      if (this.files.get(path)) {
        validFiles.set(path, symbolSet);
      }
    });

    // Format the result
    const result: SymbolToKeepMap = {
      files: new Map<string, { symbols: string[] }>(),
    };

    validFiles.forEach((symbols, path) => {
      result.files.set(path, {
        symbols: Array.from(symbols),
      });
    });

    return result;
  }

  private addSymbolToExtract(
    filePath: string,
    symbolName: string,
    filesToExtract: Map<string, Set<string>>,
  ): void {
    if (!filesToExtract.has(filePath)) {
      filesToExtract.set(filePath, new Set<string>());
    }

    if (symbolName) {
      filesToExtract.get(filePath)?.add(symbolName);
    }
  }

  private includeInitFiles(
    module: PythonModule,
    filesToExtract: Map<string, Set<string>>,
  ): void {
    // Walk up the module hierarchy and include all __init__.py files
    let current: PythonModule | undefined = module;
    while (current) {
      if (current.type === PYTHON_PACKAGE_MODULE_TYPE) {
        this.addSymbolToExtract(current.path, "", filesToExtract); // Empty string means include all symbols
      }
      current = current.parent;
    }
  }

  private collectDependenciesRecursively(
    filePath: string,
    symbol: PythonSymbol,
    filesToExtract: Map<string, Set<string>>,
    visited: Set<string>,
  ): void {
    const depKey = `${filePath}:${symbol.id}`;

    // Prevent circular dependencies
    if (visited.has(depKey)) {
      return;
    }
    visited.add(depKey);

    try {
      // Get dependencies for this symbol from the dependency map
      const fileDependencies = this.dependencyMap.get(filePath);
      if (!fileDependencies) {
        console.warn(`No dependency information found for file: ${filePath}`);
        return;
      }

      const symbolDep = fileDependencies.symbols.find(
        (s) => s.id === symbol.id,
      );

      if (!symbolDep) {
        return;
      }

      // Process each dependency
      symbolDep.dependencies.forEach((dependency, depPath) => {
        if (dependency.isExternal) {
          // Skip external dependencies
          return;
        }

        // Include necessary __init__.py files for this dependency
        const depModule = this.moduleResolver.getModuleFromFilePath(depPath);
        if (depModule) {
          this.includeInitFiles(depModule, filesToExtract);
        }

        // Handle specific symbols used from this dependency
        if (dependency.symbols.size > 0) {
          dependency.symbols.forEach((_, symbolName) => {
            this.addSymbolToExtract(depPath, symbolName, filesToExtract);

            // Find the symbol definition to get its dependencies
            const depExports = this.exportExtractor.getSymbols(depPath);
            const depSymbol = depExports.symbols.find(
              (s) => s.id === symbolName,
            );

            if (depSymbol) {
              // Recursively process this symbol's dependencies
              this.collectDependenciesRecursively(
                depPath,
                depSymbol,
                filesToExtract,
                visited,
              );
            }
          });
        } else {
          // No specific symbols - include the whole file
          this.addSymbolToExtract(depPath, "", filesToExtract);
        }
      });
    } finally {
      // Always clean up visited marker when done with this branch
      visited.delete(depKey);
    }
  }

  /**
   * Creates a minimized version of the project based on the extraction results.
   *
   * @param symbolToKeepMap The result of symbol extraction
   * @returns Map of minimized files
   */
  public extractSymbols(
    symbols: {
      name: string;
      type: string;
      filePath: string;
    }[],
  ) {
    const symbolToKeepMap = this.getSymbolsToKeep(symbols);

    const minimizedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();

    // Process each file in the extraction result
    for (const [filePath, fileInfo] of symbolToKeepMap.files.entries()) {
      const symbols = this.exportExtractor.getSymbols(filePath);

      const symbolsToRemove: PythonSymbol[] = [];
      symbols.symbols.forEach((symbol) => {
        if (!fileInfo.symbols.includes(symbol.id)) {
          symbolsToRemove.push(symbol);
        }
      });

      const existingFile = this.files.get(filePath);
      if (!existingFile) {
        throw new Error(`File ${filePath} not found in files map`);
      }

      let newRootNode = this.pruneSymbolsFromFile(
        existingFile.rootNode,
        symbolsToRemove,
      );

      newRootNode = this.removeErrorFromSource(newRootNode);

      minimizedFiles.set(filePath, {
        path: filePath,
        rootNode: newRootNode,
      });
    }

    return minimizedFiles;
  }

  /**
   * Removes symbols from a file's syntax tree
   */
  private pruneSymbolsFromFile(
    rootNode: Parser.SyntaxNode,
    symbolsToRemove: PythonSymbol[],
  ) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    symbolsToRemove.forEach((symbol) => {
      const { startIndex, endIndex } = symbol.node;
      indexesToRemove.push({ startIndex, endIndex });
    });

    const newSourceCode = removeIndexesFromSourceCode(
      rootNode.text,
      indexesToRemove,
    );

    const newRootNode = this.parser.parse(newSourceCode).rootNode;

    return newRootNode;
  }

  /**
   * Removes error nodes from source code
   */
  private removeErrorFromSource(rootNode: Parser.SyntaxNode) {
    const captures = this.removeErrorQuery.captures(rootNode);

    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    captures.forEach(({ node }) => {
      const { startIndex, endIndex } = node;
      indexesToRemove.push({ startIndex, endIndex });
    });

    const newSourceCode = removeIndexesFromSourceCode(
      rootNode.text,
      indexesToRemove,
    );

    const newRootNode = this.parser.parse(newSourceCode).rootNode;

    return newRootNode;
  }
}
