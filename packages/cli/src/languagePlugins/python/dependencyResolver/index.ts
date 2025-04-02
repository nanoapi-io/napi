import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonUsageResolver } from "../usageResolver";

/**
 * Represents the dependency information for a module.
 */
export interface ModuleDependency {
  id: string;
  isExternal: boolean;
  // A map of used symbol names (key and value are both the symbol name).
  symbols: Map<string, string>;
}

export interface SymbolDependency {
  id: string;
  characterCount: number;
  lineCount: number;
  type: string;
  dependencies: Map<string, ModuleDependency>;
}

/**
 * Represents the dependency information for a file.
 * Contains file-level dependencies and per-exported-symbol dependencies.
 */
export interface FileDependencies {
  // The path to the analyzed file.
  filePath: string;
  // The number of characters in the file.
  characterCount: number;
  // The number of lines in the file.
  lineCount: number;
  // Map of module dependencies detected at the file level.
  dependencies: Map<string, ModuleDependency>;
  // Array of dependencies specific to each exported symbol.
  symbols: SymbolDependency[];
}

/**
 * PythonDependencyResolver analyzes a Python file's AST to build a dependency manifest.
 * It uses the PythonExportExtractor to determine exported symbols and the PythonUsageResolver
 * to determine which imports are used and how they are used within the file.
 *
 * Dependencies are computed at two levels:
 *
 * 1. File-level: Based on the file's root AST node.
 * 2. Symbol-level: For each exported symbol, by analyzing its AST subtree.
 *
 * The resolver distinguishes between internal (project) and external dependencies,
 * and tracks which symbols from each module are actually used.
 *
 * Results are cached to avoid re-computation.
 */
export class PythonDependencyResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private exportExtractor: PythonExportExtractor;
  private usageResolver: PythonUsageResolver;
  private cache = new Map<string, FileDependencies>();

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportExtractor: PythonExportExtractor,
    usageResolver: PythonUsageResolver,
  ) {
    this.files = files;
    this.exportExtractor = exportExtractor;
    this.usageResolver = usageResolver;
  }

  /**
   * Constructs the complete dependency manifest for a given file.
   *
   * The dependency manifest includes:
   * - filePath: the path of the analyzed file.
   * - fileDependencies: module-level dependencies detected in the file.
   * - symbols: an array of objects representing each exported symbol and its own dependencies,
   *   computed by analyzing the exported symbol's AST subtree.
   *
   * Results are cached to improve performance.
   *
   * @param filePath The path to the file to analyze.
   * @returns A FileDependencies object with file-level and symbol-level dependency information.
   */
  public getFileDependencies(filePath: string): FileDependencies {
    const cacheKey = filePath;
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const file = this.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    const characterCount = file.rootNode.endIndex - file.rootNode.startIndex;
    const lineCount =
      file.rootNode.endPosition.row - file.rootNode.startPosition.row + 1;

    const fileDependencyManifest: FileDependencies = {
      filePath,
      characterCount,
      lineCount,
      dependencies: new Map<string, ModuleDependency>(),
      symbols: [],
    };

    const fileUsage = this.usageResolver.resolveUsage(file.path, file.rootNode);

    fileUsage.internal.forEach((internal) => {
      const dependency: ModuleDependency = {
        id: internal.moduleNode.path,
        isExternal: false,
        symbols: new Map(),
      };
      if (internal.symbols) {
        internal.symbols.forEach((symbol) => {
          dependency.symbols.set(symbol.id, symbol.id);
        });
      }
      fileDependencyManifest.dependencies.set(dependency.id, dependency);
    });

    fileUsage.external.forEach((external) => {
      const dependency: ModuleDependency = {
        id: external.moduleName,
        isExternal: true,
        symbols: new Map(),
      };
      if (external.symbolNames) {
        external.symbolNames.forEach((symbol) => {
          dependency.symbols.set(symbol, symbol);
        });
      }
      fileDependencyManifest.dependencies.set(dependency.id, dependency);
    });

    const fileSymbols = this.exportExtractor.getSymbols(filePath);

    fileSymbols.symbols.forEach((fileSymbol) => {
      const characterCount =
        fileSymbol.node.endIndex - fileSymbol.node.startIndex;
      const lineCount =
        fileSymbol.node.endPosition.row - fileSymbol.node.startPosition.row + 1;

      const SymbolDependency: SymbolDependency = {
        id: fileSymbol.id,
        characterCount,
        lineCount,
        type: fileSymbol.type,
        dependencies: new Map<string, ModuleDependency>(),
      };

      const symbolUsage = this.usageResolver.resolveUsage(
        file.path,
        fileSymbol.node,
      );

      symbolUsage.internal.forEach((internal) => {
        const dependency: ModuleDependency = {
          id: internal.moduleNode.path,
          isExternal: false,
          symbols: new Map(),
        };
        if (internal.symbols) {
          internal.symbols.forEach((symbol) => {
            dependency.symbols.set(symbol.id, symbol.id);
          });
        }
        SymbolDependency.dependencies.set(dependency.id, dependency);
      });

      symbolUsage.external.forEach((external) => {
        const dependency: ModuleDependency = {
          id: external.moduleName,
          isExternal: true,
          symbols: new Map(),
        };
        if (external.symbolNames) {
          external.symbolNames.forEach((symbol) => {
            dependency.symbols.set(symbol, symbol);
          });
        }
        SymbolDependency.dependencies.set(dependency.id, dependency);
      });
      fileDependencyManifest.symbols.push(SymbolDependency);
    });

    this.cache.set(cacheKey, fileDependencyManifest);

    return fileDependencyManifest;
  }
}
