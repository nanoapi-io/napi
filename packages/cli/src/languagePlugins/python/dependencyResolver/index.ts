import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonUsageResolver } from "../usageResolver";
import { ExternalUsage, InternalUsage } from "../usageResolver/types";
import { PythonItemResolver } from "../itemResolver";
import {
  PYTHON_INTERNAL_MODULE_TYPE,
  ResolvedExternalModule,
  ResolvedExternalSymbol,
  ResolvedInternalModule,
  ResolvedInternalSymbol,
} from "../itemResolver/types";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import {
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
} from "../moduleResolver/types";
import { FileDependencies, ModuleDependency, SymbolDependency } from "./types";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  ImportStatement,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "../importExtractor/types";

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
  private importExtractor: PythonImportExtractor;
  private itemResolver: PythonItemResolver;
  private usageResolver: PythonUsageResolver;
  private moduleResolver: PythonModuleResolver;
  private fileDependenciesCache = new Map<string, FileDependencies>();

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportExtractor: PythonExportExtractor,
    importExtractor: PythonImportExtractor,
    itemResolver: PythonItemResolver,
    usageResolver: PythonUsageResolver,
    moduleResolver: PythonModuleResolver,
  ) {
    this.files = files;
    this.exportExtractor = exportExtractor;
    this.importExtractor = importExtractor;
    this.itemResolver = itemResolver;
    this.usageResolver = usageResolver;
    this.moduleResolver = moduleResolver;
  }

  public getFileDependencies(path: string) {
    if (this.fileDependenciesCache.has(path)) {
      return this.fileDependenciesCache.get(path) as FileDependencies;
    }

    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    const fileDependencies: FileDependencies = {
      filePath: file.path,
      metrics: {
        characterCount: file.rootNode.text.length,
        lineCount: file.rootNode.endPosition.row + 1,
      },
      dependencies: new Map<string, ModuleDependency>(),
      symbols: [],
    };

    // Get module from file path
    const fileModule = this.moduleResolver.getModuleFromFilePath(file.path);

    // Get all imports
    const importStmts = this.importExtractor.getImportStatements(file.path);

    // Analyze dependencies for the file-level node
    const { internalUsageMap, externalUsageMap } =
      this.analyzeDependenciesForNode(file.rootNode, fileModule, importStmts);

    // Convert usage maps to dependencies
    fileDependencies.dependencies = new Map([
      ...this.convertInternalUsageToDependencies(internalUsageMap),
      ...this.convertExternalUsageToDependencies(externalUsageMap),
    ]);

    // get all symbols
    const { symbols } = this.exportExtractor.getSymbols(file.path);

    // For each symbol, resolve its dependencies
    for (const symbol of symbols) {
      const symbolDependencies: SymbolDependency = {
        id: symbol.id,
        type: symbol.type,
        metrics: {
          characterCount: symbol.node.text.length,
          lineCount:
            symbol.node.endPosition.row - symbol.node.startPosition.row,
        },
        dependencies: new Map<string, ModuleDependency>(),
      };

      // filter import statements, ignore the one that are within other symbols
      // as well as the one after ther symbol
      const filteredImportStmts = importStmts.filter((importStmt) => {
        const isBeforeSymbol = importStmt.node.endIndex < symbol.node.endIndex;
        let isWithinOtherSymbols = false;
        symbols.forEach((otherSymbol) => {
          if (
            otherSymbol.id !== symbol.id &&
            importStmt.node.startIndex >= otherSymbol.node.startIndex &&
            importStmt.node.endIndex <= otherSymbol.node.endIndex
          ) {
            isWithinOtherSymbols = true;
          }
        });

        return isBeforeSymbol && !isWithinOtherSymbols;
      });

      // Analyze dependencies for the symbol-level node
      const {
        internalUsageMap: symbolInternalUsageMap,
        externalUsageMap: symbolExternalUsageMap,
      } = this.analyzeDependenciesForNode(
        symbol.node,
        fileModule,
        filteredImportStmts,
      );

      // Resolve internal usage for other symbols in the file
      for (const otherSymbol of symbols) {
        if (otherSymbol.id === symbol.id) {
          continue;
        }
        this.usageResolver.resolveInternalUsageForSymbol(
          symbol.node,
          filteredImportStmts.map((stmt) => stmt.node),
          fileModule,
          otherSymbol,
          otherSymbol.identifierNode.text,
          symbolInternalUsageMap,
        );
      }

      // Convert usage maps to dependencies
      symbolDependencies.dependencies = new Map([
        ...this.convertInternalUsageToDependencies(symbolInternalUsageMap),
        ...this.convertExternalUsageToDependencies(symbolExternalUsageMap),
      ]);

      fileDependencies.symbols.push(symbolDependencies);
    }

    // Cache the file dependencies
    this.fileDependenciesCache.set(path, fileDependencies);

    return fileDependencies;
  }

  /**
   * Analyzes dependencies for a given AST node (can be a file or symbol node)
   * @param node The AST node to analyze
   * @param contextModule The module context for resolving imports
   * @param importStmts The import statements to consider
   * @returns Maps containing internal and external usage information
   */
  private analyzeDependenciesForNode(
    node: Parser.SyntaxNode,
    contextModule: PythonModule, // Using any here for simplicity
    importStmts: ImportStatement[],
  ): {
    internalUsageMap: Map<string, InternalUsage>;
    externalUsageMap: Map<string, ExternalUsage>;
  } {
    // Initialize usage result
    const internalUsageMap = new Map<string, InternalUsage>();
    const externalUsageMap = new Map<string, ExternalUsage>();

    const nodesToExclude = importStmts.map((importStmt) => importStmt.node);

    // Process all explicit imports first - both normal imports and from-imports
    // (excluding wildcards) in the order they appear in the file
    for (const importStmt of importStmts) {
      if (importStmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        // For "from X import Y" statements
        const member = importStmt.members[0];

        if (member.isWildcardImport) {
          // process wildcard import last
          continue;
        }

        // Try to resolve the source module (X in "from X import Y")
        // This could be an internal module or an external one
        const sourceModule = this.moduleResolver.resolveModule(
          contextModule,
          member.identifierNode.text,
        );

        for (const item of member.items || []) {
          // Internal module
          if (sourceModule) {
            const resolvedItem = this.itemResolver.resolveItem(
              sourceModule,
              item.identifierNode.text,
            );
            if (!resolvedItem) {
              // Skip items that can't be resolved instead of throwing
              continue;
            }
            if (resolvedItem.type === PYTHON_INTERNAL_MODULE_TYPE) {
              const internalResolvedModule =
                resolvedItem as ResolvedInternalModule;
              if (internalResolvedModule.symbol) {
                const internalResolvedSymbol =
                  internalResolvedModule as ResolvedInternalSymbol;

                // Pass the immediate re-exporting module if it's different from the original module
                const reExportingModule =
                  internalResolvedSymbol.module.path !== sourceModule.path
                    ? sourceModule
                    : undefined;

                this.usageResolver.resolveInternalUsageForSymbol(
                  node,
                  nodesToExclude,
                  internalResolvedSymbol.module,
                  internalResolvedSymbol.symbol,
                  item.aliasNode?.text || item.identifierNode.text,
                  internalUsageMap,
                  reExportingModule,
                );

                // Add all modules in the re-export chain as dependencies
                if (
                  internalResolvedSymbol.reExportChain &&
                  internalResolvedSymbol.reExportChain.length > 0
                ) {
                  for (const reExportModule of internalResolvedSymbol.reExportChain) {
                    if (reExportModule.path !== sourceModule.path) {
                      // Skip the immediate re-exporter (already handled)
                      this.usageResolver.resolveInternalUsageForSymbol(
                        node,
                        nodesToExclude,
                        internalResolvedSymbol.module, // Original module
                        internalResolvedSymbol.symbol, // Original symbol
                        item.aliasNode?.text || item.identifierNode.text,
                        internalUsageMap,
                        reExportModule, // Intermediate re-exporting module
                      );
                    }
                  }
                }
              } else {
                this.usageResolver.resolveInternalUsageForModule(
                  node,
                  nodesToExclude,
                  internalResolvedModule.module,
                  item.aliasNode?.text || item.identifierNode.text,
                  internalUsageMap,
                );
              }
            }
          } else {
            // external module
            this.usageResolver.resolveExternalUsageForItem(
              node,
              nodesToExclude,
              {
                moduleName: member.identifierNode.text,
                itemName: item.identifierNode.text,
              },
              item.aliasNode?.text || item.identifierNode.text,
              externalUsageMap,
            );
          }
        }
      }

      if (importStmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
        importStmt.members.forEach((member) => {
          const resolvedItem = this.itemResolver.resolveItem(
            contextModule,
            member.aliasNode?.text || member.identifierNode.text,
          );
          if (!resolvedItem) {
            // Skip items that can't be resolved
            return;
          }

          if (resolvedItem.type === PYTHON_INTERNAL_MODULE_TYPE) {
            const internalResolvedModule =
              resolvedItem as ResolvedInternalModule;
            this.usageResolver.resolveInternalUsageForModule(
              node,
              nodesToExclude,
              internalResolvedModule.module,
              member.aliasNode?.text || member.identifierNode.text,
              internalUsageMap,
            );
          } else {
            const externalResolvedModule =
              resolvedItem as ResolvedExternalModule;
            this.usageResolver.resolveExternalUsageForItem(
              node,
              nodesToExclude,
              {
                moduleName: externalResolvedModule.moduleName,
              },
              member.aliasNode?.text || member.identifierNode.text,
              externalUsageMap,
            );
          }
        });
      }
    }

    // Process wildcard imports last
    for (const importStmt of importStmts) {
      if (importStmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        const member = importStmt.members[0];
        if (!member.isWildcardImport) {
          continue;
        }

        const sourceModule = this.moduleResolver.resolveModule(
          contextModule,
          member.identifierNode.text,
        );

        // For external modules, we can't resolve items
        // Only thing we can do is to add the module as a dependency
        if (!sourceModule) {
          // External module processing is done when converting usage map to dependencies
          continue;
        } else {
          // internal module, we can resolve items
          const resolvedItem = this.itemResolver.resolveItem(
            sourceModule,
            member.identifierNode.text,
          );
          if (!resolvedItem) {
            continue;
          }
          if (resolvedItem.type === PYTHON_INTERNAL_MODULE_TYPE) {
            const internalResolvedModule =
              resolvedItem as ResolvedInternalModule;
            if (!internalResolvedModule.symbol) {
              continue;
            }
            const internalResolvedSymbol =
              internalResolvedModule as ResolvedInternalSymbol;

            this.usageResolver.resolveInternalUsageForSymbol(
              node,
              nodesToExclude,
              internalResolvedSymbol.module,
              internalResolvedSymbol.symbol,
              internalResolvedSymbol.symbol.identifierNode.text,
              internalUsageMap,
            );
          } else {
            const externalResolvedModule =
              resolvedItem as ResolvedExternalModule;
            if (!externalResolvedModule.symbol) {
              continue;
            }
            const externalResolvedSymbol =
              externalResolvedModule as ResolvedExternalSymbol;
            this.usageResolver.resolveExternalUsageForItem(
              node,
              nodesToExclude,
              {
                moduleName: externalResolvedSymbol.moduleName,
                itemName: externalResolvedSymbol.symbolName,
              },
              externalResolvedSymbol.symbolName,
              externalUsageMap,
            );
          }
        }
      }
    }

    return { internalUsageMap, externalUsageMap };
  }

  /**
   * Converts internal usage map to module dependencies
   */
  private convertInternalUsageToDependencies(
    internalUsageMap: Map<string, InternalUsage>,
  ): Map<string, ModuleDependency> {
    const dependencies = new Map<string, ModuleDependency>();

    for (const [modulePath, usage] of internalUsageMap.entries()) {
      const dependency: ModuleDependency = {
        id: modulePath,
        isExternal: false,
        isNamespaceModule: usage.module.type === PYTHON_NAMESPACE_MODULE_TYPE,
        symbols: new Set(),
      };

      // Add all used symbols
      for (const symbol of usage.symbols.values()) {
        dependency.symbols.add(symbol.identifierNode.text);
      }

      dependencies.set(modulePath, dependency);

      // Add re-exporting modules as dependencies without symbols
      if (usage.reExportingModules) {
        for (const [
          reExportingModulePath,
          reExportingModule,
        ] of usage.reExportingModules.entries()) {
          if (!dependencies.has(reExportingModulePath)) {
            dependencies.set(reExportingModulePath, {
              id: reExportingModulePath,
              isExternal: false,
              isNamespaceModule:
                reExportingModule.type === PYTHON_NAMESPACE_MODULE_TYPE,
              symbols: new Set(), // Empty set since we don't need specific symbols
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Converts external usage map to module dependencies
   */
  private convertExternalUsageToDependencies(
    externalUsageMap: Map<string, ExternalUsage>,
  ): Map<string, ModuleDependency> {
    const dependencies = new Map<string, ModuleDependency>();

    for (const [modulePath, usage] of externalUsageMap.entries()) {
      const dependency: ModuleDependency = {
        id: modulePath,
        isExternal: true,
        isNamespaceModule: false,
        symbols: new Set(),
      };

      // Add all used items
      for (const itemName of usage.itemNames) {
        dependency.symbols.add(itemName);
      }

      dependencies.set(modulePath, dependency);
    }

    return dependencies;
  }
}
