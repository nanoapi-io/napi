/**
 * Python Usage Resolver
 *
 * This module provides functionality to analyze and track how Python modules and symbols are used
 * within Python source code. It helps identify which imported modules and their exported symbols
 * are actually referenced in the code, which is essential for dependency analysis and dead code detection.
 *
 * The implementation uses Tree-sitter for parsing Python code into an Abstract Syntax Tree (AST),
 * then traverses the AST to find references to modules and symbols.
 *
 * Key features:
 * - Tracks usage of internal modules (within the project)
 * - Tracks usage of external modules (from standard library or third-party)
 * - Distinguishes between module imports and symbol imports
 * - Handles aliased imports correctly
 * - Detects re-exports of imported symbols
 */
import {
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
} from "../moduleResolver/types";
import { PythonExportExtractor } from "../exportExtractor";
import Parser from "tree-sitter";
import { PythonSymbol } from "../exportExtractor/types";
import { ExternalUsage, InternalUsage } from "./types";

/**
 * UsageResolver analyzes Python code to identify module and symbol references.
 * It tracks which imported modules and symbols are actually used within a file.
 *
 * This class provides essential information for:
 * - Dependency analysis (what modules depend on what)
 * - Dead code detection (which imports are unused)
 * - Refactoring safety (understanding the impact of changes)
 */
export class PythonUsageResolver {
  /**
   * Tree-sitter parser for Python code
   * Used to parse and analyze Python ASTs
   */
  private parser: Parser;

  /**
   * Export extractor for retrieving symbols from modules
   * Used to get the symbols defined in each module
   */
  private exportExtractor: PythonExportExtractor;

  /**
   * Tree-sitter query for finding identifiers and attributes in code
   * Used to locate references to modules and symbols
   */
  private query: Parser.Query;

  /**
   * Creates a new UsageResolver instance
   * @param parser - Tree-sitter parser for Python code analysis
   * @param exportExtractor - Utility for extracting exported symbols from Python modules
   */
  constructor(parser: Parser, exportExtractor: PythonExportExtractor) {
    this.parser = parser;
    this.exportExtractor = exportExtractor;
    this.query = new Parser.Query(
      this.parser.getLanguage(),
      `
        ((identifier) @id)
        ((attribute) @attr)
      `,
    );
  }

  /**
   * Finds all nodes in the AST that match the specified reference name
   *
   * @param targetNode - Root node to search within
   * @param nodesToExclude - Nodes to ignore during the search (like import statements)
   * @param refToLookFor - The name/reference to search for in the code
   * @returns Array of matching syntax nodes
   */
  private getUsageNode(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    refToLookFor: string,
    isLeaf: boolean,
  ) {
    let captures = this.query.captures(targetNode);

    // Filter out nodes that are inside excluded nodes
    captures = captures.filter(({ node }) => {
      // First filter by text match
      if (node.text !== refToLookFor) {
        return false;
      }

      const isNodeInsideAnyExclude = this.isNodeInsideAnyExclude(
        node,
        nodesToExclude,
      );

      if (isNodeInsideAnyExclude) {
        return false;
      }

      // if we have a leaf node (a symbol) we can skip this check.
      // this is because the usage might be a nested class or function.
      // In such case, we want to include the usage.
      if (isLeaf) return true;

      // If the node is an identifier, check if it's inside an attribute chain
      // This avoids counting the parts of expressions like `module.attribute`
      // as standalone references
      if (node.type === "identifier") {
        const parent = node.parent;
        if (parent && parent.type === "attribute") {
          return false;
        }
      }

      return true;
    });

    const nodes = captures.map(({ node }) => node);
    return nodes;
  }

  /**
   * Determines whether a node is contained within any of the excluded nodes
   *
   * @param node - Node to check
   * @param nodesToExclude - List of nodes that should be excluded
   * @returns True if the node is inside an excluded region, false otherwise
   */
  private isNodeInsideAnyExclude(
    node: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
  ): boolean {
    return nodesToExclude.some(
      (excludeNode) =>
        node.startIndex >= excludeNode.startIndex &&
        node.endIndex <= excludeNode.endIndex,
    );
  }

  /**
   * Records usage of a specific symbol from a module
   *
   * @param targetNode - AST node to search within
   * @param nodesToExclude - Nodes to exclude from search
   * @param module - Module containing the symbol
   * @param symbol - Symbol being checked for usage
   * @param lookupRef - Reference name to search for (often includes module alias)
   * @param internalUsageMap - Map to record usage information
   * @param reExportingModule - Optional module that re-exports this symbol
   */
  public resolveInternalUsageForSymbol(
    /* The node to search for usage. eg a function or class */
    targetNode: Parser.SyntaxNode,
    /* Nodes to exclude from the search. eg import statements */
    nodesToExclude: Parser.SyntaxNode[],
    /* Internal python module to resolve usage for */
    module: PythonModule,
    /* Internal python symbol to resolve usage for */
    symbol: PythonSymbol,
    /* potential alias. Or name of the module */
    lookupRef: string,
    /* Map of internal usage results, used for recursions */
    internalUsageMap: Map<string, InternalUsage>,
    /* Optional module that re-exports this symbol */
    reExportingModule?: PythonModule,
  ) {
    const usageNodes = this.getUsageNode(
      targetNode,
      nodesToExclude,
      lookupRef,
      true,
    );

    if (usageNodes.length > 0) {
      if (!internalUsageMap.has(module.path)) {
        internalUsageMap.set(module.path, {
          module,
          symbols: new Map(),
          reExportingModules: reExportingModule ? new Map() : undefined,
        });
      }
      const internalUsage = internalUsageMap.get(module.path) as {
        module: PythonModule;
        symbols: Map<string, PythonSymbol>;
        reExportingModules?: Map<string, PythonModule>;
      };

      if (!internalUsage.symbols.has(symbol.id)) {
        internalUsage.symbols.set(symbol.id, symbol);
      }

      // Add re-exporting module as a dependency if provided
      if (reExportingModule) {
        if (!internalUsage.reExportingModules) {
          internalUsage.reExportingModules = new Map();
        }
        if (!internalUsage.reExportingModules.has(reExportingModule.path)) {
          internalUsage.reExportingModules.set(
            reExportingModule.path,
            reExportingModule,
          );
        }
      }
    }
  }

  /**
   * Analyzes code for usage of a module and its symbols
   *
   * This method serves as the main entry point for analyzing how modules and their symbols are used in Python code.
   * It performs several key tasks:
   *
   * 1. Checks for direct references to the module itself
   * 2. Checks for references to symbols (functions, classes, variables) defined within the module
   * 3. Recursively checks for usage of submodules and their symbols
   *
   * This multi-layered analysis ensures complete tracking of module dependencies,
   * whether they're used directly or through nested references.
   *
   * @param targetNode - AST node to search within
   * @param nodesToExclude - Nodes to exclude from search (e.g. import statements)
   * @param module - Module to check for usage
   * @param lookupRef - Reference name to look for (potentially an alias)
   * @param internalUsageMap - Map to record module and symbol usage
   */
  public resolveInternalUsageForModule(
    /* The node to search for usage. eg a function or class */
    targetNode: Parser.SyntaxNode,
    /* Nodes to exclude from the search. eg import statements */
    nodesToExclude: Parser.SyntaxNode[],
    /* Internal python module to resolve usage for */
    module: PythonModule,
    /* potential alias. Or name of the module */
    lookupRef: string,
    /* Map of internal usage results, used for recursions */
    internalUsageMap: Map<string, InternalUsage>,
  ) {
    const symbols: PythonSymbol[] = [];

    const moduleUsageNodes = this.getUsageNode(
      targetNode,
      nodesToExclude,
      lookupRef,
      false,
    );
    if (moduleUsageNodes.length > 0) {
      // Register module usage even without specific symbols
      if (!internalUsageMap.has(module.path)) {
        internalUsageMap.set(module.path, {
          module,
          symbols: new Map(),
        });
      }
    }

    // namespace module are not file, so they do not have symbols
    if (module.type !== PYTHON_NAMESPACE_MODULE_TYPE) {
      const exports = this.exportExtractor.getSymbols(module.path);
      symbols.push(...exports.symbols);
    }

    // check for usage of module.symbol
    symbols.forEach((symbol) => {
      const symbolLookupRef = `${lookupRef}.${symbol.identifierNode.text}`;

      this.resolveInternalUsageForSymbol(
        targetNode,
        nodesToExclude,
        module,
        symbol,
        symbolLookupRef,
        internalUsageMap,
      );
    });

    // check for usage of submodules
    module.children.forEach((subModule) => {
      const subModuleLookupRef = `${lookupRef}.${subModule.name}`;

      this.resolveInternalUsageForModule(
        targetNode,
        nodesToExclude,
        subModule,
        subModuleLookupRef,
        internalUsageMap,
      );
    });
  }

  /**
   * Resolves external usage for a module item, tracking both direct references
   * and attribute access patterns
   *
   * This method analyzes how external Python modules (like standard library or third-party packages)
   * are used in the code. It performs two key tasks:
   *
   * 1. Identifies direct references to the module itself
   * 2. Tracks attribute access patterns (like numpy.array, requests.get, etc.)
   *
   * The method maintains a hierarchical structure of usage, which helps in understanding
   * not just which modules are imported, but specifically which parts of those modules
   * are actually being used in the code.
   *
   * @param targetNode - AST node to search within
   * @param nodesToExclude - Nodes to exclude from search
   * @param itemName - Name of the external module/item to check
   * @param lookupRef - Reference name to look for (potentially an alias)
   * @param externalUsageMap - Map to record external usage
   */
  public resolveExternalUsageForItem(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    item: {
      moduleName: string;
      itemName?: string;
    },
    lookupRef: string,
    externalUsageMap: Map<string, ExternalUsage>,
  ) {
    const usageNodes = this.getUsageNode(
      targetNode,
      nodesToExclude,
      lookupRef,
      true,
    );

    if (usageNodes.length > 0) {
      // Initialize entry for base module
      if (!externalUsageMap.has(item.moduleName)) {
        externalUsageMap.set(item.moduleName, {
          moduleName: item.moduleName,
          itemNames: new Set(),
        });
      }

      // Add the item name to the usage map
      if (item.itemName) {
        externalUsageMap.get(item.moduleName)?.itemNames.add(item.itemName);
      } else {
        // try resolving symbols fromt the usage node
        usageNodes.forEach((usageNode) => {
          const symbol = this.resolveExternalUsageSymbolFromUsage(usageNode);
          if (symbol) {
            externalUsageMap.get(item.moduleName)?.itemNames.add(symbol);
          }
        });
      }
    }
  }

  private resolveExternalUsageSymbolFromUsage(usageNode: Parser.SyntaxNode) {
    if (usageNode.parent && usageNode.parent.type === "attribute") {
      const attributeName = usageNode.parent.childForFieldName("attribute");
      if (attributeName) {
        return attributeName.text;
      }
    }
  }
}
