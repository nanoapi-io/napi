import Parser from "tree-sitter";
import { ModuleNode } from "../moduleMapper";

/**
 * Represents the usage of an internal module in the AST (excluding import statements).
 */
export interface InternalUsageResult {
  // The module node corresponding to the used module.
  moduleNode: ModuleNode;
  // Symbols or submodule names used from the module.
  // If empty, the module is referenced but no specific symbols are detected.
  symbols: string[];
}

/**
 * Represents the usage of an external module in the AST.
 */
export interface ExternalUsageResult {
  moduleName: string;
  symbols: string[];
}

/**
 * PythonUsageResolver analyzes a file's AST to determine which parts of an import are used.
 *
 * It supports two primary strategies:
 *
 * 1. **Internal Module Resolution:**
 *    - When explicit symbols are provided, it checks for each symbol usage.
 *    - If an explicit symbol corresponds to a child module (i.e. a submodule imported as a symbol),
 *      it delegates usage extraction to that submodule. This covers edge cases such as:
 *
 *          from module import submodule
 *          def foo():
 *              submodule.bar()
 *
 *      Here, even though "submodule" is an explicit symbol, its usage ("bar") belongs to the submodule.
 *
 *    - If no explicit symbols are provided, it falls back to checking the usage of the module
 *      (and its attribute chains) as a whole.
 *
 * 2. **External Module Resolution:**
 *    - External modules are treated atomically.
 *    - If explicit symbols are provided, each is checked individually.
 *    - Otherwise, the module itself is checked for any usage.
 */
export class PythonUsageResolver {
  private parser: Parser;

  /**
   * Initialize the resolver with a Tree-sitter parser.
   *
   * @param parser The parser instance used for AST queries.
   */
  constructor(parser: Parser) {
    this.parser = parser;
  }

  /**
   * Searches for the usage of a specific symbol in the AST,
   * while ignoring nodes (like import statements) provided in nodesToExclude.
   *
   * @param targetNode The root AST node to search.
   * @param nodesToExclude Nodes to ignore (e.g. inside import statements).
   * @param symbolText The text of the symbol to look for.
   * @param module The module node linked with this symbol.
   * @param results A map to store and update found symbol usage.
   * @returns The updated map with the found symbol usage.
   */
  private extractUsageOfInternalSymbol(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    symbolText: string,
    module: ModuleNode,
    results: Map<string, InternalUsageResult>,
  ) {
    // Create a query that looks for identifiers matching symbolText.
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `((identifier) @id (#eq? @id "${symbolText}"))`,
    );

    const captures = query.captures(targetNode);
    for (const { node } of captures) {
      // Skip nodes that fall inside excluded regions (e.g. import statements)
      for (const nodeToExclude of nodesToExclude) {
        if (
          node.startIndex >= nodeToExclude.startIndex &&
          node.endIndex <= nodeToExclude.endIndex
        ) {
          continue;
        }
        // Use module.filePath or module.fullName as the key.
        const key = module.filePath || module.fullName;
        const result = results.get(key);
        if (result) {
          // Add symbol if it's not already recorded.
          if (!result.symbols.includes(symbolText)) {
            result.symbols.push(symbolText);
          }
          results.set(key, result);
        } else {
          results.set(key, {
            moduleNode: module,
            symbols: [symbolText],
          });
        }
        // Found the symbol outside the excluded regions; break out.
        break;
      }
    }

    return results;
  }

  /**
   * Searches for module usage (including dotted attribute chains) in the AST,
   * while ignoring nodes provided in nodesToExclude.
   *
   * This function handles both simple identifiers and dotted chains (e.g. "module.submodule").
   *
   * @param targetNode The root AST node to search.
   * @param nodesToExclude Nodes to skip (e.g. inside import statements).
   * @param moduleText The text of the module reference.
   * @param module The module node corresponding to the import.
   * @param results A map to store and update found module usage.
   * @returns The updated map with found usage of the module or its submodules.
   */
  private extractUsageOfInternalModule(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    moduleText: string,
    module: ModuleNode,
    results: Map<string, InternalUsageResult>,
  ) {
    let query: Parser.Query;

    // If moduleText contains a dot, search for attribute nodes; otherwise, for identifiers.
    const parts = moduleText.split(".");
    if (parts.length > 1) {
      query = new Parser.Query(
        this.parser.getLanguage(),
        `((attribute) @attr (#eq? @attr "${moduleText}"))`,
      );
    } else {
      query = new Parser.Query(
        this.parser.getLanguage(),
        `((identifier) @identifier (#eq? @identifier "${moduleText}"))`,
      );
    }

    const captures = query.captures(targetNode);
    for (let { node } of captures) {
      // Skip nodes inside excluded sections.
      for (const nodeToExclude of nodesToExclude) {
        if (
          node.startIndex >= nodeToExclude.startIndex &&
          node.endIndex <= nodeToExclude.endIndex
        ) {
          continue;
        }

        // Climb up the AST to capture the full attribute chain (e.g. "module.submodule.bar").
        while (node.parent && node.parent.type === "attribute") {
          node = node.parent;
        }

        const parts = node.text.split(".");
        let usedSymbol: string | undefined = undefined;
        let usedModule: ModuleNode = module;
        // Skip the base module and check for further parts.
        for (let i = 1; i < parts.length; i++) {
          const targetModule = usedModule.children.get(parts[i]);
          if (targetModule) {
            // Found a child module; update usedModule.
            usedModule = targetModule;
          } else {
            // The part is not a submodule; treat it as a used symbol.
            usedSymbol = parts[i];
            break;
          }
        }
        // Record the usage if both a module and a symbol are identified.
        if (usedModule && usedSymbol) {
          const key = usedModule.filePath || usedModule.fullName;
          const result = results.get(key);
          if (result) {
            if (!result.symbols.includes(usedSymbol)) {
              result.symbols.push(usedSymbol);
            }
            results.set(key, result);
          } else {
            results.set(key, {
              moduleNode: usedModule,
              symbols: [usedSymbol],
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Determines which parts of an internal module are used in the file's AST.
   *
   * It supports two modes:
   *
   * 1. **Explicit Symbols Mode:**
   *    When explicit symbols are provided, the resolver iterates over them.
   *    - If an explicit symbol matches a child module in moduleNode.children,
   *      it delegates the extraction to that child module. This handles cases like:
   *
   *          from module import submodule
   *          def foo():
   *              submodule.bar()
   *
   *      In this example, "submodule" is imported explicitly, and its usage ("bar") is resolved
   *      by analyzing the child module node.
   *    - Otherwise, the explicit symbol is checked as a normal symbol on the base module.
   *
   * 2. **Fallback Mode:**
   *    If no explicit symbols are provided, it checks for usage of the module itself (and its
   *    attribute chains) using the module's alias (if available) or its identifier.
   *
   * @param targetNode The root AST node of the file.
   * @param module An object with module details:
   *  - identifier: The module name.
   *  - alias: Optional alias for the module.
   *  - moduleNode: The corresponding ModuleNode.
   *  - explicitSymbols: List of symbols (with optional aliases) imported explicitly.
   * @param nodesToExclude Nodes to ignore (e.g. inside import statements).
   * @returns A map of InternalUsageResult keyed by module's filePath or fullName.
   */
  public resolveUsageForInternalModule(
    targetNode: Parser.SyntaxNode,
    module: {
      identifier: string;
      alias?: string;
      moduleNode: ModuleNode;
      explicitSymbols: { identifier: string; alias?: string }[];
    },
    nodesToExclude: Parser.SyntaxNode[],
  ) {
    let results = new Map<string, InternalUsageResult>();

    // If explicit symbols are provided, process each.
    if (module.explicitSymbols.length > 0) {
      for (const symbol of module.explicitSymbols) {
        const symbolName = symbol.alias || symbol.identifier;
        // Check if the explicit symbol corresponds to a child module.
        const childModule = module.moduleNode.children.get(symbolName);
        if (childModule) {
          // Delegate resolution to the child module so that its internal usage (e.g. "bar" in submodule.bar()) is detected.
          results = this.extractUsageOfInternalModule(
            targetNode,
            nodesToExclude,
            symbolName,
            childModule,
            results,
          );
        } else {
          // Otherwise, check for a normal symbol usage on the base module.
          results = this.extractUsageOfInternalSymbol(
            targetNode,
            nodesToExclude,
            symbolName,
            module.moduleNode,
            results,
          );
        }
      }
      return results;
    }

    // Fallback: if no explicit symbols are provided, check for usage of the module itself.
    results = this.extractUsageOfInternalModule(
      targetNode,
      nodesToExclude,
      module.alias || module.identifier,
      module.moduleNode,
      results,
    );

    return results;
  }

  /**
   * Checks if a reference (identifier) is used in the AST (excluding nodesToExclude).
   *
   * @param targetNode The root AST node to search.
   * @param nodesToExclude Nodes to ignore (e.g. import statements).
   * @param refName The reference name to look for.
   * @returns True if the reference is used, otherwise false.
   */
  private isExternalRefUsed(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    refName: string,
  ) {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `((identifier) @id (#eq? @id "${refName}"))`,
    );

    const captures = query.captures(targetNode);
    for (const { node } of captures) {
      for (const nodeToExclude of nodesToExclude) {
        if (
          node.startIndex >= nodeToExclude.startIndex &&
          node.endIndex <= nodeToExclude.endIndex
        ) {
          continue;
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Determines which parts of an external module are used in the AST.
   *
   * External modules are treated as atomic units:
   * - If explicit symbols are provided, each is checked individually.
   * - Otherwise, the module itself is checked for usage.
   *
   * @param targetNode The root AST node of the file.
   * @param module An object with external module details:
   *  - identifier: The module name.
   *  - alias: Optional alias for the module.
   *  - explicitSymbols: List of symbols (with optional aliases) imported explicitly.
   * @param nodesToExclude Nodes to ignore (e.g. inside import statements).
   * @returns An ExternalUsageResult if used, or undefined if not used.
   */
  public resolveUsageForExternalModule(
    targetNode: Parser.SyntaxNode,
    module: {
      identifier: string;
      alias?: string;
      explicitSymbols: { identifier: string; alias?: string }[];
    },
    nodesToExclude: Parser.SyntaxNode[],
  ) {
    const results: ExternalUsageResult = {
      moduleName: module.identifier,
      symbols: [],
    };

    // If explicit symbols are provided, check each.
    if (module.explicitSymbols.length > 0) {
      for (const symbol of module.explicitSymbols) {
        const isUsed = this.isExternalRefUsed(
          targetNode,
          nodesToExclude,
          symbol.alias || symbol.identifier,
        );
        if (isUsed) {
          results.symbols.push(symbol.alias || symbol.identifier);
        }
      }
      return results;
    }

    // Otherwise, check for usage of the module itself.
    const isUsed = this.isExternalRefUsed(
      targetNode,
      nodesToExclude,
      module.alias || module.identifier,
    );
    if (isUsed) {
      return results;
    }
  }
}
