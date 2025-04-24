import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor/index.js";
import { PythonUsageResolver } from "../usageResolver/index.js";
import { ExternalUsage, InternalUsage } from "../usageResolver/types.js";
import { PythonItemResolver } from "../itemResolver/index.js";
import {
  PYTHON_INTERNAL_MODULE_TYPE,
  ResolvedExternalModule,
  ResolvedExternalSymbol,
  ResolvedInternalModule,
  ResolvedInternalSymbol,
} from "../itemResolver/types.js";
import { PythonImportExtractor } from "../importExtractor/index.js";
import { PythonModuleResolver } from "../moduleResolver/index.js";
import {
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
} from "../moduleResolver/types.js";
import {
  FileDependencies,
  ModuleDependency,
  SymbolDependency,
} from "./types.js";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  ImportStatement,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "../importExtractor/types.js";
import { PythonMetricsAnalyzer } from "../metricAnalyzer/index.js";
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
  private metricsAnalyzer: PythonMetricsAnalyzer;
  private fileDependenciesCache = new Map<string, FileDependencies>();

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportExtractor: PythonExportExtractor,
    importExtractor: PythonImportExtractor,
    itemResolver: PythonItemResolver,
    usageResolver: PythonUsageResolver,
    moduleResolver: PythonModuleResolver,
    metricsAnalyzer: PythonMetricsAnalyzer,
  ) {
    this.files = files;
    this.exportExtractor = exportExtractor;
    this.importExtractor = importExtractor;
    this.itemResolver = itemResolver;
    this.usageResolver = usageResolver;
    this.moduleResolver = moduleResolver;
    this.metricsAnalyzer = metricsAnalyzer;
  }

  public getFileDependencies(path: string) {
    if (this.fileDependenciesCache.has(path)) {
      return this.fileDependenciesCache.get(path) as FileDependencies;
    }

    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    const complexityMetrics = this.metricsAnalyzer.analyzeNodes([
      file.rootNode,
    ]);

    const fileDependencies: FileDependencies = {
      filePath: file.path,
      metrics: {
        characterCount: complexityMetrics.characterCount,
        codeCharacterCount: complexityMetrics.codeCharacterCount,
        linesCount: complexityMetrics.linesCount,
        codeLineCount: complexityMetrics.codeLinesCount,
        cyclomaticComplexity: complexityMetrics.cyclomaticComplexity,
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
      const complexityMetrics = this.metricsAnalyzer.analyzeNodes(symbol.nodes);

      const symbolDependencies: SymbolDependency = {
        id: symbol.id,
        type: symbol.type,
        metrics: {
          characterCount: complexityMetrics.characterCount,
          codeCharacterCount: complexityMetrics.codeCharacterCount,
          linesCount: complexityMetrics.linesCount,
          codeLineCount: complexityMetrics.codeLinesCount,
          cyclomaticComplexity: complexityMetrics.cyclomaticComplexity,
        },
        dependencies: new Map<string, ModuleDependency>(),
      };

      // Process each node of the symbol independently, then merge results
      const symbolInternalUsageMap = new Map<string, InternalUsage>();
      const symbolExternalUsageMap = new Map<string, ExternalUsage>();

      // For each node of the symbol, analyze its dependencies
      for (const symbolNode of symbol.nodes) {
        // Find import statements that are relevant for this specific node
        const nodeImportStmts = this.filterImportStatementsForNode(
          symbolNode,
          importStmts,
          symbols,
        );

        // Analyze dependencies for the current node
        const nodeResult = this.analyzeDependenciesForNode(
          symbolNode,
          fileModule,
          nodeImportStmts,
        );

        // Merge the results into the symbol's usage maps
        this.mergeUsageMaps(
          nodeResult.internalUsageMap,
          symbolInternalUsageMap,
        );
        this.mergeUsageMaps(
          nodeResult.externalUsageMap,
          symbolExternalUsageMap,
        );

        // Resolve internal usage for other symbols in the file for this node
        for (const otherSymbol of symbols) {
          if (otherSymbol.id === symbol.id) {
            continue;
          }

          this.usageResolver.resolveInternalUsageForSymbol(
            symbolNode,
            nodeImportStmts.map((stmt) => stmt.node),
            fileModule,
            otherSymbol,
            otherSymbol.identifierNode.text,
            symbolInternalUsageMap,
          );
        }
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
   * Filters import statements that are relevant for a specific node of a symbol
   * @param symbolNode The specific node of a symbol
   * @param allImportStmts All import statements in the file
   * @param allSymbols All symbols in the file
   * @returns Filtered import statements relevant for this node
   */
  private filterImportStatementsForNode(
    symbolNode: Parser.SyntaxNode,
    allImportStmts: ImportStatement[],
    allSymbols: {
      id: string;
      nodes: Parser.SyntaxNode[];
      identifierNode: Parser.SyntaxNode;
      type: string;
    }[],
  ): ImportStatement[] {
    return allImportStmts.filter((importStmt) => {
      // Include only imports that come before this node
      const isBeforeNode = importStmt.node.endIndex < symbolNode.endIndex;

      // Exclude imports that are contained within other symbols
      let isWithinOtherSymbols = false;

      for (const otherSymbol of allSymbols) {
        for (const otherNode of otherSymbol.nodes) {
          // Skip the current node we're analyzing
          if (otherNode === symbolNode) {
            continue;
          }

          // Check if the import is contained within another symbol's node
          if (
            importStmt.node.startIndex >= otherNode.startIndex &&
            importStmt.node.endIndex <= otherNode.endIndex
          ) {
            isWithinOtherSymbols = true;
            break;
          }
        }

        if (isWithinOtherSymbols) {
          break;
        }
      }

      return isBeforeNode && !isWithinOtherSymbols;
    });
  }

  /**
   * Merges two usage maps together, combining their contents
   */
  private mergeUsageMaps<T extends InternalUsage | ExternalUsage>(
    source: Map<string, T>,
    target: Map<string, T>,
  ): void {
    for (const [key, sourceValue] of source.entries()) {
      if (!target.has(key)) {
        target.set(key, sourceValue);
      } else {
        const targetValue = target.get(key);

        if (targetValue) {
          // Handle internal usage maps
          if ("symbols" in sourceValue && "symbols" in targetValue) {
            const sourceInternal = sourceValue as InternalUsage;
            const targetInternal = targetValue as InternalUsage;

            // Merge symbols
            for (const [symbolId, symbol] of sourceInternal.symbols.entries()) {
              targetInternal.symbols.set(symbolId, symbol);
            }

            // Merge re-exporting modules if they exist
            if (sourceInternal.reExportingModules) {
              if (!targetInternal.reExportingModules) {
                targetInternal.reExportingModules = new Map();
              }

              for (const [
                modulePath,
                module,
              ] of sourceInternal.reExportingModules.entries()) {
                targetInternal.reExportingModules.set(modulePath, module);
              }
            }
          }
          // Handle external usage maps
          else if ("itemNames" in sourceValue && "itemNames" in targetValue) {
            const sourceExternal = sourceValue as ExternalUsage;
            const targetExternal = targetValue as ExternalUsage;

            // Merge item names
            for (const itemName of sourceExternal.itemNames) {
              targetExternal.itemNames.add(itemName);
            }
          }
        }
      }
    }
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
