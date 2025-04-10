import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "../importExtractor/types";
import { PythonModuleResolver } from "../moduleResolver";
import {
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
} from "../moduleResolver/types";
import {
  PYTHON_EXTERNAL_MODULE_TYPE,
  PYTHON_INTERNAL_MODULE_TYPE,
  ResolvedExternalModule,
  ResolvedExternalSymbol,
  ResolvedInternalModule,
  ResolvedInternalSymbol,
  ResolvedItem,
  ResolvedSymbol,
} from "./types";

/**
 * PythonItemResolver resolves items across Python modules following Python's
 * import resolution rules, handling both internal and external dependencies.
 *
 * The resolver implements Python's symbol resolution algorithm:
 * 1. Symbols defined directly in a module take precedence
 * 2. Explicitly imported symbols are checked next
 * 3. Wildcard imports are checked last, in order of appearance
 *
 * It handles both internal modules (analyzable within the project) and external
 * modules (from third-party or standard libraries). The resolver uses caching
 * to improve performance and to handle circular dependencies.
 */
export class PythonItemResolver {
  // Cache for final symbol resolution results
  private resolutionCache = new Map<string, ResolvedItem | undefined>();

  /**
   * Cache for in-progress resolutions to handle circular dependencies.
   *
   * When a symbol resolution is in progress but not completed, we store
   * its partial result here. This prevents infinite recursion when modules
   * import each other in a circular fashion, which is allowed in Python.
   */
  private recursiveCache = new Map<string, ResolvedItem | undefined>();

  // Cache for all symbols in a module, used for wildcard imports
  private allSymbolsCache = new Map<string, Map<string, ResolvedSymbol>>();

  constructor(
    private exportExtractor: PythonExportExtractor,
    private importExtractor: PythonImportExtractor,
    private moduleResolver: PythonModuleResolver,
  ) {}

  /**
   * Resolves a symbol name from the perspective of a module.
   *
   * This method follows Python's import resolution rules to find the definition
   * of a symbol, whether it's defined directly in the module, imported from another
   * module, or comes from a wildcard import.
   *
   * @param fromModule - The module context where the symbol is referenced
   * @param itemName - The name of the item (symbol or module) to resolve
   * @returns The resolved item information or undefined if not found
   */
  public resolveItem(
    fromModule: PythonModule,
    itemName: string,
  ): ResolvedItem | undefined {
    // Generate cache key based on starting module and symbol name
    const cacheKey = `${fromModule.path}:${itemName}`;

    // Check if already resolved
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey);
    }

    // Track visited module-symbol pairs to detect cycles
    const visited = new Set<string>();
    const result = this.resolveItemImpl(fromModule, itemName, visited);

    // Cache the final result
    this.resolutionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Implementation of the item resolution logic following Python's resolution order
   *
   * Resolution happens in this specific order:
   * 1. Check if the item is defined directly in this module
   * 2. Check explicitly imported items (via direct imports or from-imports)
   * 3. Check wildcard imports last, in order of appearance
   *
   * @param module - The module from which to resolve the item
   * @param itemName - The name of the item (symbol or module) to resolve
   * @param visited - Set of already visited module:item pairs to prevent circular resolution
   * @returns The resolved item or undefined if not found
   */
  private resolveItemImpl(
    module: PythonModule,
    itemName: string,
    visited: Set<string>,
  ): ResolvedItem | undefined {
    const visitKey = `${module.path}:${itemName}`;

    // Check for circular references
    if (visited.has(visitKey)) {
      return undefined;
    }

    // Check recursive resolution cache
    if (this.recursiveCache.has(visitKey)) {
      return this.recursiveCache.get(visitKey);
    }

    visited.add(visitKey);

    // Python resolution order:
    // 1. Check symbols defined directly in this module
    // 2. Check explicitly imported items (via direct or from-imports)
    // 3. Check wildcard imports last, in order of appearance

    // 1. If module is a namespace package,
    // Cause these have are not files, so they have no
    // imports or sumbols.
    if (module.type !== PYTHON_NAMESPACE_MODULE_TYPE) {
      // 2. Check if symbol is defined directly in this module
      // Get all symbols defined in this module using the export extractor
      const exports = this.exportExtractor.getSymbols(module.path);

      // Look for direct symbol match by comparing symbol ids with the requested item name
      const directSymbol = exports.symbols.find((sym) => sym.id === itemName);

      // Direct symbol resolution:
      // If the symbol is defined directly in this module, we can return it immediately
      // Python always gives priority to symbols defined directly in the module,
      // regardless of any __all__ restrictions (which only affect what's exported)
      if (directSymbol) {
        // Create a resolved internal item with the found symbol
        const result = {
          type: PYTHON_INTERNAL_MODULE_TYPE,
          module: module,
          symbol: directSymbol,
        } as ResolvedInternalSymbol;
        this.recursiveCache.set(visitKey, result);
        return result;
      }

      // 3. Check imports in order of appearance in the file
      // Python resolves imports sequentially based on their order in the file,
      // with the only exception being wildcard imports which are always lowest priority
      const importStatements = this.importExtractor.getImportStatements(
        module.path,
      );

      // Store last resolved item from explicit imports
      // In Python, later imports with the same name override earlier ones
      let lastExplicitImport: ResolvedItem | undefined;

      // Process all explicit imports first - both normal imports and from-imports
      // (excluding wildcards) in the order they appear in the file
      for (const stmt of importStatements) {
        if (stmt.type === FROM_IMPORT_STATEMENT_TYPE) {
          // For "from X import Y" statements
          const member = stmt.members[0];

          if (member.isWildcardImport) {
            // Process wildcard import last
            continue;
          }

          // Try to resolve the source module (X in "from X import Y")
          // This could be an internal module or an external one
          const sourceModule = this.moduleResolver.resolveModule(
            module,
            member.identifierNode.text,
          );

          // 3.1 Check if explicit import
          for (const item of member.items || []) {
            const lookupName = item.aliasNode?.text || item.identifierNode.text;

            // itemName matches the imported name
            if (itemName === lookupName) {
              if (sourceModule) {
                // internal module reference
                lastExplicitImport = this.resolveItemImpl(
                  sourceModule,
                  item.identifierNode.text,
                  visited,
                );
              } else {
                // external module reference
                lastExplicitImport = {
                  type: PYTHON_EXTERNAL_MODULE_TYPE,
                  moduleName: member.identifierNode.text,
                  symbolName: item.identifierNode.text,
                } as ResolvedExternalSymbol;
              }
              // Don't return immediately, continue processing for possible overrides
            }
          }
        }

        // 3.2 Check normal import
        if (stmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
          for (const member of stmt.members) {
            const lookupName =
              member.aliasNode?.text || member.identifierNode.text;

            if (itemName === lookupName) {
              const sourceModule = this.moduleResolver.resolveModule(
                module,
                member.identifierNode.text,
              );

              // Internal module reference
              if (sourceModule) {
                lastExplicitImport = {
                  type: PYTHON_INTERNAL_MODULE_TYPE,
                  module: sourceModule,
                } as ResolvedInternalModule;
              } else {
                // External module reference
                lastExplicitImport = {
                  type: PYTHON_EXTERNAL_MODULE_TYPE,
                  moduleName: member.identifierNode.text,
                } as ResolvedExternalModule;
              }
              // Don't return immediately, continue processing for possible overrides
            }
          }
        }
      }

      // After all explicit imports, return the last one found (if any)
      if (lastExplicitImport) {
        this.recursiveCache.set(visitKey, lastExplicitImport);
        return lastExplicitImport;
      }

      // 3.3 Process wildcard imports last, in order of appearance
      for (const stmt of importStatements) {
        if (stmt.type === FROM_IMPORT_STATEMENT_TYPE) {
          // For "from X import Y" statements
          const member = stmt.members[0];

          // Try to resolve the source module (X in "from X import Y")
          // This could be an internal module or an external one
          const sourceModule = this.moduleResolver.resolveModule(
            module,
            member.identifierNode.text,
          );

          // Handle wildcard imports (from X import *)
          if (member.isWildcardImport) {
            if (sourceModule) {
              // For internal wildcard imports, we need to respect the __all__ list
              // Python only imports symbols listed in __all__ if it exists
              const sourceExports = this.exportExtractor.getSymbols(
                sourceModule.path,
              );

              if (sourceExports.publicSymbols) {
                // If the source module has an __all__ list defined:
                // Only continue if the requested item is listed in __all__
                // This matches Python's behavior where wildcard imports only import
                // symbols explicitly listed in __all__
                if (!sourceExports.publicSymbols.includes(itemName)) {
                  continue; // Skip this import as the item isn't in __all__
                }
              } else {
                // If no __all__ list exists, Python only imports non-underscore-prefixed names
                // Skip private symbols (those starting with underscore)
                if (itemName.startsWith("_")) {
                  continue; // Skip private symbols in wildcard imports
                }
              }

              // Recursively try to resolve the item from the source module
              const result = this.resolveItemImpl(
                sourceModule,
                itemName,
                visited,
              );
              if (result) {
                this.recursiveCache.set(visitKey, result);
                return result;
              }
            }
            // For external wildcard imports (modules we can't analyze):
            // We can't determine what symbols are available without analyzing the external module
            // We skip this import and continue checking other imports
            continue;
          }
        }
      }
    }

    // Check if the item is defined directly in this module
    const childModule = module.children.get(itemName);
    if (childModule) {
      const result = {
        type: PYTHON_INTERNAL_MODULE_TYPE,
        module: childModule,
      } as ResolvedInternalModule;
      // Return the resolved child module as an internal item
      return result;
    }

    // Not found in this module or any imports
    this.recursiveCache.set(visitKey, undefined);
    return undefined;
  }

  /**
   * Returns all symbols that would be imported through a wildcard import from this module.
   *
   * This method follows Python's wildcard import rules:
   * - If __all__ is defined in the module, only symbols listed there are included
   * - Otherwise, all symbols that don't begin with an underscore are included
   * - Direct definitions in the module take precedence over any imports
   * - Explicit imports take precedence over wildcard imports
   * - Wildcard imports have lowest precedence, processed in order of appearance
   *
   * @param module - The module to collect wildcard-importable symbols from
   * @returns Map of symbol names to their resolved definitions
   */
  public getWildcardSymbols(module: PythonModule): Map<string, ResolvedSymbol> {
    // Check cache first
    const cacheKey = module.path;
    if (this.allSymbolsCache.has(cacheKey)) {
      return this.allSymbolsCache.get(cacheKey) as Map<string, ResolvedSymbol>;
    }

    // Create a new map for storing all symbols
    const result = new Map<string, ResolvedSymbol>();

    // Track visited modules to prevent infinite recursion
    const visited = new Set<string>();

    this.collectSymbols(module, result, visited);

    // Cache the result
    this.allSymbolsCache.set(cacheKey, result);
    return result;
  }

  /**
   * Collects all symbols from a module that would be available for import,
   * following Python's symbol visibility and precedence rules.
   *
   * Python's symbol resolution has specific rules for wildcard imports:
   * 1. Local definitions take precedence over any imports
   *    - If __all__ is defined, only symbols in __all__ are included
   *    - Otherwise, non-underscore-prefixed symbols are included
   * 2. Explicit imports (both regular and from-imports) are processed next, in order
   * 3. Wildcard imports have lowest precedence and are processed last, in order
   *
   * This ensures consistent symbol resolution matching Python's behavior.
   *
   * @param module - The module from which to collect symbols
   * @param symbolsMap - Map to store the collected symbols
   * @param visited - Set of already visited modules to prevent circular imports
   */
  private collectSymbols(
    module: PythonModule,
    symbolsMap: Map<string, ResolvedSymbol>,
    visited: Set<string>,
  ): void {
    // Prevent circular imports
    if (visited.has(module.path)) {
      return;
    }
    visited.add(module.path);

    // for namespace modules, they don't have direct symbols
    if (module.type === PYTHON_NAMESPACE_MODULE_TYPE) {
      return;
    }

    // 1. Get all symbols defined directly in this module
    // Python gives highest precedence to local definitions
    const exports = this.exportExtractor.getSymbols(module.path);
    for (const symbol of exports.symbols) {
      if (exports.publicSymbols) {
        // Check if the symbol is in __all__
        if (exports.publicSymbols.includes(symbol.id)) {
          symbolsMap.set(symbol.id, {
            type: PYTHON_INTERNAL_MODULE_TYPE,
            module: module,
            symbol: symbol,
          } as ResolvedInternalSymbol);
        }
      } else {
        // If no __all__, add all public symbols
        // unless they are private (starting with underscore)
        if (!symbol.id.startsWith("_")) {
          symbolsMap.set(symbol.id, {
            type: PYTHON_INTERNAL_MODULE_TYPE,
            module: module,
            symbol: symbol,
          } as ResolvedInternalSymbol);
        }
      }
    }

    // 2. Process imports in the correct order of precedence:
    // First explicit imports, then wildcard imports
    const importStatements = this.importExtractor.getImportStatements(
      module.path,
    );

    // First pass: process all explicit imports in order of appearance
    // Explicit imports take precedence over wildcard imports in Python
    for (const stmt of importStatements) {
      if (stmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        const member = stmt.members[0];

        // Skip wildcard imports in first pass
        if (member.isWildcardImport) {
          continue;
        }

        const sourceModule = this.moduleResolver.resolveModule(
          module,
          member.identifierNode.text,
        );

        if (member.isWildcardImport) {
          // Process wildcard import last
          continue;
        }

        // Handle explicit imports
        for (const item of member.items || []) {
          const lookupName = item.aliasNode?.text || item.identifierNode.text;

          if (sourceModule) {
            // for internal modules
            const resolved = this.resolveItem(
              sourceModule,
              item.identifierNode.text,
            );
            if (resolved) {
              if (resolved.type === PYTHON_INTERNAL_MODULE_TYPE) {
                // Explicit imports always override previously imported names
                symbolsMap.set(lookupName, {
                  type: PYTHON_INTERNAL_MODULE_TYPE,
                  module: resolved.module,
                  symbol: resolved.symbol,
                } as ResolvedInternalSymbol);
              } else {
                // External module reference
                symbolsMap.set(lookupName, {
                  type: PYTHON_EXTERNAL_MODULE_TYPE,
                  moduleName: resolved.moduleName,
                  symbolName: item.identifierNode.text,
                } as ResolvedExternalSymbol);
              }
            }
          } else {
            // External module reference
            symbolsMap.set(lookupName, {
              type: PYTHON_EXTERNAL_MODULE_TYPE,
              moduleName: member.identifierNode.text,
              symbolName: item.identifierNode.text,
            } as ResolvedExternalSymbol);
          }
        }
      }
    }

    // Second pass: process wildcard imports in order of appearance
    // Wildcard imports have lowest precedence in Python's import system
    for (const stmt of importStatements) {
      if (stmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        const member = stmt.members[0];

        // Only process wildcard imports in second pass
        if (member.isWildcardImport) {
          const sourceModule = this.moduleResolver.resolveModule(
            module,
            member.identifierNode.text,
          );

          // Handle wildcard imports
          if (sourceModule) {
            // For internal modules, we can get all symbols
            const sourceSymbols = this.getWildcardSymbols(sourceModule);
            for (const [name, resolved] of sourceSymbols) {
              // Check if the symbol is not already defined
              // In Python, symbols from earlier imports (or local definitions)
              // always shadow symbols from later wildcard imports
              if (!symbolsMap.has(name)) {
                if (resolved.type === PYTHON_INTERNAL_MODULE_TYPE) {
                  // If it's an internal symbol, add it to the map
                  symbolsMap.set(name, {
                    type: PYTHON_INTERNAL_MODULE_TYPE,
                    module: resolved.module,
                    symbol: resolved.symbol,
                  } as ResolvedInternalSymbol);
                } else {
                  // If it's an external symbol, add it to the map
                  symbolsMap.set(name, {
                    type: PYTHON_EXTERNAL_MODULE_TYPE,
                    moduleName: resolved.moduleName,
                    symbolName: name,
                  } as ResolvedExternalSymbol);
                }
              }
            }
          }
        }
      }
    }
  }
}
