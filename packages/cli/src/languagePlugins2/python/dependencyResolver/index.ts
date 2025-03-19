import Parser from "tree-sitter";
import { PythonExportResolver } from "../exportResolver";
import { ImportStatement, PythonImportResolver } from "../importResolver";
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

/**
 * Represents the dependency information for a file.
 * Contains file-level dependencies and per-exported-symbol dependencies.
 */
export interface FileDependencies {
  filePath: string;
  // Map of module dependencies detected at the file level.
  fileDependencies: Map<string, ModuleDependency>;
  // Array of dependencies specific to each exported symbol.
  symbols: {
    id: string;
    type: string;
    // Dependencies detected within the exported symbol's AST subtree.
    fileDependencies: Map<string, ModuleDependency>;
  }[];
}

/**
 * A mapping from file paths to their dependency information.
 */
export type ProjectDependencyManifesto = Map<string, FileDependencies>;

/**
 * PythonDependencyResolver analyzes a Python file's AST to build a dependency manifesto.
 * It uses the ExportResolver to determine exported symbols, the ImportResolver to extract import statements,
 * and the UsageResolver to determine which parts of an import are actually used.
 *
 * Dependencies are computed at two levels:
 *
 * 1. File-level: Based on the file's root AST node.
 * 2. Symbol-level: For each exported symbol, by analyzing its AST subtree.
 *
 * Results are cached to avoid re-computation.
 */
export class PythonDependencyResolver {
  private parser: Parser;
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private exportResolver: PythonExportResolver;
  private importResolver: PythonImportResolver;
  private usageResolver: PythonUsageResolver;
  private cache = new Map<string, FileDependencies>();

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportResolver: PythonExportResolver,
    importResolver: PythonImportResolver,
    usageResolver: PythonUsageResolver,
  ) {
    this.parser = parser;
    this.files = files;
    this.exportResolver = exportResolver;
    this.importResolver = importResolver;
    this.usageResolver = usageResolver;
  }

  /**
   * Returns AST nodes to exclude when checking for usage (e.g. the nodes corresponding to import statements).
   *
   * @param targetNode The AST node to analyze.
   * @returns An array of nodes to exclude from usage queries.
   */
  private getNodeToExcludeFromUsage(
    targetNode: Parser.SyntaxNode,
  ): Parser.SyntaxNode[] {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      [
        (import_from_statement) @imp
        (import_statement) @imp
      ]
      `,
    );
    const captures = query.captures(targetNode);
    return captures.map(({ node }) => node);
  }

  /**
   * Analyzes a target AST node (either the file root or an exported symbol's node) to determine module dependencies.
   *
   * For each resolved import statement module, this function:
   * - Gets nodes to exclude from usage queries (e.g. import statement nodes).
   * - For internal modules (with a filePath), builds a module info object (including explicit symbols)
   *   and calls resolveUsageForInternalModule.
   * - For external modules, calls resolveUsageForExternalModule.
   *
   * The usage resolver returns a map where each key is the module's filePath or fullName and
   * each value contains an array of used symbols. This function then merges these results into a
   * map of ModuleDependency objects.
   *
   * @param targetNode The AST node to analyze.
   * @param importStatements An array of resolved import statements for the file.
   * @returns A map of module dependency information keyed by module id.
   */
  private getTargetNodeDependencies(
    targetNode: Parser.SyntaxNode,
    importStatements: ImportStatement[],
  ): Map<string, ModuleDependency> {
    const fileDependencies = new Map<string, ModuleDependency>();

    // Process each import statement.
    importStatements.forEach((importStmt) => {
      // Process each resolved module from the statement.
      importStmt.modules.forEach((importModule) => {
        // Exclude the nodes (e.g. import statements) from the usage query.
        const nodesToExclude = this.getNodeToExcludeFromUsage(targetNode);

        if (importModule.module) {
          // Internal module: build a module info object including explicit symbols.
          const moduleInfo = {
            identifier: importModule.source,
            alias: importModule.alias,
            moduleNode: importModule.module,
            explicitSymbols: importModule.symbols.map((s) => ({
              identifier: s.id,
              alias: s.alias,
            })),
          };

          // Resolve usage for the internal module within the target AST.
          const usage = this.usageResolver.resolveUsageForInternalModule(
            targetNode,
            moduleInfo,
            nodesToExclude,
          );

          if (usage.size > 0) {
            // For each usage result, merge the used symbols into the dependency map.
            usage.forEach((usageResult) => {
              const key =
                usageResult.moduleNode.filePath ||
                usageResult.moduleNode.fullName;
              let fileDep = fileDependencies.get(key);
              if (!fileDep) {
                fileDep = {
                  id: key,
                  isExternal: false,
                  symbols: new Map(),
                };
              }
              // For each symbol used, add it to the dependency's symbol map.
              usageResult.symbols.forEach((sym) => {
                fileDep.symbols.set(sym, sym);
              });
              fileDependencies.set(key, fileDep);
            });
          }
        } else {
          // External module: build a module info object (without a moduleNode).
          const moduleInfo = {
            identifier: importModule.source,
            alias: importModule.alias,
            explicitSymbols: importModule.symbols.map((s) => ({
              identifier: s.id,
              alias: s.alias,
            })),
          };
          // Resolve usage for the external module.
          const extUsage = this.usageResolver.resolveUsageForExternalModule(
            targetNode,
            moduleInfo,
            nodesToExclude,
          );
          if (extUsage) {
            let fileDep = fileDependencies.get(extUsage.moduleName);
            if (!fileDep) {
              fileDep = {
                id: extUsage.moduleName,
                isExternal: true,
                symbols: new Map(),
              };
            }
            extUsage.symbols.forEach((sym) => {
              fileDep.symbols.set(sym, sym);
            });
            fileDependencies.set(fileDep.id, fileDep);
          }
        }
      });
    });

    return fileDependencies;
  }

  /**
   * Constructs the complete dependency manifesto for a given file.
   *
   * The dependency manifesto includes:
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

    // Retrieve exported symbols from the file.
    const exportedSymbols = this.exportResolver.getSymbols(filePath);
    // Retrieve all import statements from the file.
    const importedStatements =
      this.importResolver.getImportStatements(filePath);

    // Compute file-level dependencies using the file's root AST node.
    const fileDependencies = this.getTargetNodeDependencies(
      file.rootNode,
      importedStatements,
    );

    const fileDependencyManifesto: FileDependencies = {
      filePath,
      fileDependencies,
      symbols: [],
    };

    // For each exported symbol, compute its dependencies using the symbol's AST subtree.
    exportedSymbols.forEach((symbol) => {
      const symDeps = this.getTargetNodeDependencies(
        symbol.node,
        importedStatements,
      );
      fileDependencyManifesto.symbols.push({
        id: symbol.id,
        type: symbol.type,
        fileDependencies: symDeps,
      });
    });

    this.cache.set(cacheKey, fileDependencyManifesto);

    return fileDependencyManifesto;
  }
}
