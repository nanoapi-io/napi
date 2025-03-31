import { PythonExportExtractor, Symbol } from "../exportExtractor";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
  PythonImportExtractor,
} from "../importExtractor";
import {
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
  PythonModuleResolver,
} from "../moduleResolver";

/**
 * Represents an item resolved within a Python module.
 * - `module`: The Python module where the item is defined.
 * - `symbol`: The resolved item (which can be a class, function, or other identifier);
 *             undefined if the resolution targets a module directly.
 */
export interface ResolvedItem {
  module: PythonModule;
  symbol: Symbol | undefined;
}

/**
 * PythonItemResolver resolves items imported across Python modules,
 * handling aliases, wildcard imports, and re-exported items.
 *
 * This resolver processes both "from-import" and standard import statements,
 * recursively traversing imports to locate the definition of a given item.
 */
export class PythonItemResolver {
  // Cache for resolveItem results
  private itemResolveCache = new Map<string, ResolvedItem | undefined>();
  // Cache for recursive resolution to improve performance of complex imports
  private recursiveResolveCache = new Map<string, ResolvedItem | undefined>();
  // Cache for resolveAllSymbols results
  private moduleSymbolsCache = new Map<string, Map<string, ResolvedItem>>();

  constructor(
    private exportExtractor: PythonExportExtractor,
    private importExtractor: PythonImportExtractor,
    private moduleMapper: PythonModuleResolver,
  ) {}

  /**
   * Public method to resolve the given item name from the perspective of the current module.
   *
   * @param currentModule - The module from which the item resolution starts.
   * @param importedSymbolName - The name of the item to resolve.
   * @returns The resolved item details, or undefined if not found.
   */
  public resolveItem(
    currentModule: PythonModule,
    importedSymbolName: string,
  ): ResolvedItem | undefined {
    // Generate a cache key for this resolution request
    const cacheKey = `${currentModule.path}|${importedSymbolName}`;

    // Check if we have a cached result
    if (this.itemResolveCache.has(cacheKey)) {
      return this.itemResolveCache.get(cacheKey);
    }

    const visited = new Set<string>();
    const result = this.recursiveResolve(
      currentModule,
      importedSymbolName,
      visited,
    );

    // Cache the result for future use
    this.itemResolveCache.set(cacheKey, result);
    return result;
  }

  /**
   * Recursively resolves an item through imports and exports, handling
   * aliases, wildcard imports, and circular dependencies.
   *
   * @param module - The current module to inspect for the item.
   * @param symbolName - The name of the item being resolved.
   * @param visited - Tracks visited modules and item names to avoid infinite loops.
   * @returns The resolved item details, or undefined if not resolvable.
   */
  private recursiveResolve(
    module: PythonModule,
    symbolName: string,
    visited: Set<string>,
  ): ResolvedItem | undefined {
    const key = `${module.fullName}|${symbolName}`;

    // Detect circular imports to prevent infinite recursion.
    if (visited.has(key)) {
      console.warn(`Circular import detected: ${key}`);
      return undefined;
    }

    // Check cache for this recursive call
    if (this.recursiveResolveCache.has(key)) {
      return this.recursiveResolveCache.get(key);
    }

    visited.add(key);

    // Check if the item is directly exported by this module.
    // Only if the module is not a namespace module.
    // Cause these do not have any content, so no need to check exports.
    if (module.type !== PYTHON_NAMESPACE_MODULE_TYPE) {
      const exports = this.exportExtractor.getSymbols(module.path);
      const directSymbol = exports.symbols.find((sym) => sym.id === symbolName);

      if (directSymbol) {
        // The item is directly defined and exported from this module.
        const result = {
          module: module,
          symbol: directSymbol,
        };
        this.recursiveResolveCache.set(key, result);
        return result;
      }

      // If the module has an explicit public interface (__all__), ensure the item is public.
      if (
        exports.publicSymbols &&
        !exports.publicSymbols.includes(symbolName)
      ) {
        this.recursiveResolveCache.set(key, undefined);
        return undefined; // Item not publicly exported via __all__
      }
    }

    // Item not found directly; inspect imports for potential re-exports.
    // Check if the module is a namespace module. These are not files so have no imports.
    // So we skip checking imports in these cases.
    if (module.type !== PYTHON_NAMESPACE_MODULE_TYPE) {
      const importStmts = this.importExtractor.getImportStatements(module.path);

      for (const importStmt of importStmts) {
        if (importStmt.type === FROM_IMPORT_STATEMENT_TYPE) {
          const sourceModuleName = importStmt.members[0].identifierNode.text;
          if (!sourceModuleName) continue;

          const sourceModule = this.moduleMapper.resolveModule(
            module.path,
            sourceModuleName,
          );
          if (!sourceModule) continue;

          for (const importedMember of importStmt.members) {
            // Handle wildcard imports (e.g., from module import *).
            if (importedMember.isWildcardImport) {
              const result = this.recursiveResolve(
                sourceModule,
                symbolName,
                visited,
              );
              if (result) {
                this.recursiveResolveCache.set(key, result);
                return result;
              }
            }

            // Handle explicitly imported items (e.g., from module import item as alias).
            if (importedMember.items) {
              for (const item of importedMember.items) {
                const alias = item.aliasNode?.text || item.identifierNode.text;
                if (alias === symbolName) {
                  const originalSymbolName = item.identifierNode.text;
                  const result = this.recursiveResolve(
                    sourceModule,
                    originalSymbolName,
                    visited,
                  );
                  if (result) {
                    this.recursiveResolveCache.set(key, result);
                    return result;
                  }
                }
              }
            }
          }
        } else if (importStmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
          // Handle standard imports (e.g., import moduleX as alias).
          for (const member of importStmt.members) {
            const alias = member.aliasNode?.text || member.identifierNode.text;
            if (alias === symbolName) {
              const sourceModule = this.moduleMapper.resolveModule(
                module.path,
                member.identifierNode.text,
              );
              if (!sourceModule) continue;

              const result = {
                module: sourceModule,
                symbol: undefined,
              };
              this.recursiveResolveCache.set(key, result);
              return result;
            }
          }
        }
      }
    }

    // Unable to resolve the item after checking exports and imports.
    this.recursiveResolveCache.set(key, undefined);
    return undefined;
  }

  public resolveAllSymbols(module: PythonModule): Map<string, ResolvedItem> {
    // Check the cache first using module path as key
    const cacheKey = module.path;
    const cachedValue = this.moduleSymbolsCache.get(cacheKey);
    if (cachedValue) {
      // Return a copy of the cached result to prevent mutation of cached data
      return new Map(cachedValue);
    }

    const resolvedSymbols = new Map<string, ResolvedItem>();
    const visitedModules = new Set<string>();

    this.collectAllSymbols(module, resolvedSymbols, visitedModules);

    // Cache the result for future use - store a copy to avoid shared references
    this.moduleSymbolsCache.set(cacheKey, new Map(resolvedSymbols));

    return resolvedSymbols;
  }

  private collectAllSymbols(
    module: PythonModule,
    symbolsMap: Map<string, ResolvedItem>,
    visitedModules: Set<string>,
  ) {
    // Prevent infinite recursion with circular imports
    if (visitedModules.has(module.path)) {
      return;
    }
    visitedModules.add(module.path);

    // Check if we have a cache for this module's symbols
    const cacheKey = module.path;
    if (this.moduleSymbolsCache.has(cacheKey)) {
      // If cached, just copy the symbols to our result map
      const cachedSymbols =
        this.moduleSymbolsCache.get(cacheKey) ||
        new Map<string, ResolvedItem>();
      for (const [name, item] of cachedSymbols.entries()) {
        symbolsMap.set(name, item);
      }
      return;
    }

    // First, handle symbols directly defined in the module
    // Cache this module's symbols for future use
    // Create a temporary map just for symbols from this module
    const moduleSymbols = new Map<string, ResolvedItem>();

    // If __all__ defined, only export explicitly listed symbols
    const exports = this.exportExtractor.getSymbols(module.path);
    const explicitPublicSymbols = new Set(exports.publicSymbols);

    if (explicitPublicSymbols.size > 0) {
      for (const symbolId of explicitPublicSymbols) {
        const resolved = this.resolveItem(module, symbolId);
        if (resolved) {
          moduleSymbols.set(symbolId, resolved);
          symbolsMap.set(symbolId, resolved);
        }
      }
    } else {
      // Otherwise, export all directly defined symbols
      for (const symbol of exports.symbols) {
        const resolved = {
          module,
          symbol,
        };
        moduleSymbols.set(symbol.id, resolved);
        symbolsMap.set(symbol.id, resolved);
      }
    }

    // Now handle re-exported symbols via imports
    const importStmts = this.importExtractor.getImportStatements(module.path);

    for (const importStmt of importStmts) {
      if (importStmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        const sourceModuleName = importStmt.members[0].identifierNode.text;
        if (!sourceModuleName) continue;

        const sourceModule = this.moduleMapper.resolveModule(
          module.path,
          sourceModuleName,
        );
        if (!sourceModule) continue;

        for (const importedMember of importStmt.members) {
          if (importedMember.isWildcardImport) {
            // Get all symbols from source module, respecting __all__ or filtering private symbols
            const sourceSymbols = this.resolveAllSymbols(sourceModule);
            const sourceExports = this.exportExtractor.getSymbols(
              sourceModule.path,
            );

            // Filter and add symbols based on visibility rules
            for (const [name, item] of sourceSymbols.entries()) {
              if (
                sourceExports.publicSymbols
                  ? sourceExports.publicSymbols.includes(name)
                  : !name.startsWith("_") // If no __all__, only include public symbols
              ) {
                moduleSymbols.set(name, item);
                symbolsMap.set(name, item);
              }
            }
          } else if (importedMember.items) {
            // Handle explicit imports
            for (const item of importedMember.items) {
              const originalSymbolName = item.identifierNode.text;
              const alias = item.aliasNode?.text || originalSymbolName;

              const resolved = this.resolveItem(
                sourceModule,
                originalSymbolName,
              );
              if (resolved) {
                moduleSymbols.set(alias, resolved);
                symbolsMap.set(alias, resolved);
              }
            }
          }
        }
      } else if (importStmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
        // Handle standard imports
        for (const member of importStmt.members) {
          const alias = member.aliasNode?.text || member.identifierNode.text;
          const sourceModule = this.moduleMapper.resolveModule(
            module.path,
            member.identifierNode.text,
          );
          if (sourceModule) {
            const resolved = {
              module: sourceModule,
              symbol: undefined,
            };
            moduleSymbols.set(alias, resolved);
            symbolsMap.set(alias, resolved);
          }
        }
      }
    }

    // Cache the module's own symbols
    this.moduleSymbolsCache.set(cacheKey, moduleSymbols);
  }

  /**
   * Clears all caches used by the resolver.
   * Call this when files change to ensure resolver uses updated information.
   */
  public clearCache(): void {
    this.itemResolveCache.clear();
    this.recursiveResolveCache.clear();
    this.moduleSymbolsCache.clear();
  }
}
