import Parser from "tree-sitter";
import { ModuleNode } from "../moduleMapper";

/**
 * Represents the usage of a module in the AST (excluding import statements).
 */
export interface ImportUsageResult {
  // The module node corresponding to the used module.
  moduleNode: ModuleNode;
  // Symbols or submodule names used from the module.
  // If empty, the module is referenced but no specific symbols are detected.
  symbols: string[];
}

/**
 * PythonUsageResolver checks which parts of an internal import are used in a file's AST.
 * It looks for explicit symbol usage and attribute chains (e.g. "module.submodule.bar").
 */
export default class PythonUsageResolver {
  private parser: Parser;

  /**
   * Initialize with a Tree-sitter parser.
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
   * @param nodesToExclude Nodes that should not be considered (e.g. inside import statements).
   * @param symbolText The text of the symbol to look for.
   * @param module The module node linked with this symbol.
   * @param results A map to store and update found symbol usage.
   * @returns The updated map with the found symbol usage.
   */
  private extractUsageOfSymbol(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    symbolText: string,
    module: ModuleNode,
    results: Map<string, ImportUsageResult>,
  ) {
    // Create a query that looks for identifiers matching the symbolText.
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `((identifier) @id (#eq? @id "${symbolText}"))`,
    );

    const captures = query.captures(targetNode);
    for (const { node } of captures) {
      // Skip nodes that are within the excluded sections (e.g., import statements)
      for (const nodeToExclude of nodesToExclude) {
        if (
          node.startIndex >= nodeToExclude.startIndex &&
          node.endIndex <= nodeToExclude.endIndex
        ) {
          continue;
        }
        // Use module.filePath or module.fullName as key in the map.
        const key = module.filePath || module.fullName;
        const result = results.get(key);
        if (result) {
          // Add the symbol if not already in the list.
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
        // Once the symbol is found outside excluded nodes, no need to check further.
        break;
      }
    }

    return results;
  }

  /**
   * Searches for module usage (including dotted attribute chains) in the AST,
   * while ignoring nodes provided in nodesToExclude.
   *
   * The function handles both simple identifiers and dotted chains (e.g., "module.submodule").
   *
   * @param targetNode The root AST node to search.
   * @param nodesToExclude Nodes to skip (e.g., inside import statements).
   * @param moduleText The text of the module reference.
   * @param module The module node corresponding to the import.
   * @param results A map to store and update found module usage.
   * @returns The updated map with found usage of the module or its submodules.
   */
  private extractUsageOfModule(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    moduleText: string,
    module: ModuleNode,
    results: Map<string, ImportUsageResult>,
  ) {
    let query: Parser.Query;

    // If moduleText contains a dot, use the attribute query; otherwise, use identifier.
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
      // Skip nodes that are within the excluded sections.
      for (const nodeToExclude of nodesToExclude) {
        if (
          node.startIndex >= nodeToExclude.startIndex &&
          node.endIndex <= nodeToExclude.endIndex
        ) {
          continue;
        }

        // Climb up the tree to get the full attribute chain, e.g. "module.submodule.bar".
        while (node.parent && node.parent.type === "attribute") {
          node = node.parent;
        }

        const parts = node.text.split(".");
        let usedSymbol: string | undefined = undefined;
        let usedModule: ModuleNode = module;
        // Skip the first part (base module) and check further parts.
        for (let i = 1; i < parts.length; i++) {
          const targetModule = usedModule.children.get(parts[i]);
          if (targetModule) {
            // Found a submodule; update usedModule.
            usedModule = targetModule;
          } else {
            // The part is not a submodule; treat it as a used symbol.
            usedSymbol = parts[i];
            break;
          }
        }
        // Record the usage if both a module and a symbol are found.
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
   * It works in two ways:
   * 1. If the module has explicit symbols, it checks for each symbol usage.
   * 2. Otherwise, it checks if the module (or its submodules via attribute chains) is used.
   *
   * @param targetNode The root AST node of the file.
   * @param module An object with module details:
   *  - identifier: The module name.
   *  - alias: An optional alias for the module.
   *  - moduleNode: The corresponding ModuleNode.
   *  - explicitSymbols: List of symbols (with optional aliases) imported explicitly.
   * @param nodesToExclude Nodes to ignore (e.g. inside import statements).
   * @returns A map of ImportUsageResult keyed by module's filePath or fullName.
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
    let results = new Map<string, ImportUsageResult>();

    // If there are explicit symbols, only check for those.
    if (module.explicitSymbols.length > 0) {
      for (const symbol of module.explicitSymbols) {
        results = this.extractUsageOfSymbol(
          targetNode,
          nodesToExclude,
          symbol.alias || symbol.identifier,
          module.moduleNode,
          results,
        );
      }
      return results;
    }

    // Otherwise, check for usage of the module itself (and its attribute chains).
    results = this.extractUsageOfModule(
      targetNode,
      nodesToExclude,
      module.alias || module.identifier,
      module.moduleNode,
      results,
    );

    return results;
  }
}
