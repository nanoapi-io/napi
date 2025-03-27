import { PythonExportExtractor, Symbol } from "../exportExtractor";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
  PythonImportExtractor,
} from "../importExtractor";
import { PythonModule, PythonModuleResolver } from "../moduleResolver";

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
    const visited = new Set<string>();
    return this.recursiveResolve(currentModule, importedSymbolName, visited);
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
    visited.add(key);

    // Check if the item is directly exported by this module.
    const exports = this.exportExtractor.getSymbols(module.path);
    const directSymbol = exports.symbols.find((sym) => sym.id === symbolName);

    if (directSymbol) {
      // The item is directly defined and exported from this module.
      return {
        module: module,
        symbol: directSymbol,
      };
    }

    // If the module has an explicit public interface (__all__), ensure the item is public.
    if (
      exports.publicSymbols.length &&
      !exports.publicSymbols.includes(symbolName)
    ) {
      return undefined; // Item not publicly exported via __all__
    }

    // Item not found directly; inspect imports for potential re-exports.
    const importStmts = this.importExtractor.getImportStatements(module.path);

    for (const importStmt of importStmts) {
      if (importStmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        const sourceModuleName = importStmt.sourceNode?.text;
        if (!sourceModuleName) continue;

        // Resolve the imported module.
        const sourceModule = this.moduleMapper.resolveModule(
          module.path,
          sourceModuleName,
        );
        if (!sourceModule) continue;

        const importedMember = importStmt.members[0];

        // Handle wildcard imports (e.g., from module import *).
        if (importedMember.isWildcardImport) {
          const result = this.recursiveResolve(
            sourceModule,
            symbolName,
            visited,
          );
          if (result) return result;
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
              if (result) return result;
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

            // Resolved as a module import, not a specific item.
            return {
              module: sourceModule,
              symbol: undefined,
            };
          }
        }
      }
    }

    // Unable to resolve the item after checking exports and imports.
    return undefined;
  }
}
