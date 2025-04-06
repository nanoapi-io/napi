import Parser from "tree-sitter";
import { PythonModule, PythonModuleResolver } from "../moduleResolver";
import { Symbol } from "../exportExtractor";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  ImportStatement,
  NORMAL_IMPORT_STATEMENT_TYPE,
  PythonImportExtractor,
} from "../importExtractor";
import { PythonItemResolver } from "../itemResolver";

/**
 * Represents the usage of an internal module in the AST (excluding import statements).
 */
export interface InternalUsageResult {
  /** The module node corresponding to the used module. */
  moduleNode: PythonModule;
  /**
   * Symbols or submodule names used from the module.
   * If undefined, the module is referenced but no specific symbols are detected. */
  symbols: Symbol[] | undefined;
}

/**
 * Represents the usage of an external module in the AST.
 */
export interface ExternalUsageResult {
  /** The name of the external module. */
  moduleName: string;
  /**
   * Symbols used from the module.
   * If undefined, the module is referenced but no specific symbols are detected. */
  symbolNames: string[] | undefined;
}

export interface UsageResult {
  internal: Map<string, InternalUsageResult>;
  external: ExternalUsageResult[];
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
  private importExtractor: PythonImportExtractor;
  private moduleResolver: PythonModuleResolver;
  private itemResolver: PythonItemResolver;

  /**
   * Initialize the resolver with a Tree-sitter parser.
   *
   * @param parser The parser instance used for AST queries.
   */
  constructor(
    parser: Parser,
    importExtractor: PythonImportExtractor,
    moduleResolver: PythonModuleResolver,
    itemResolver: PythonItemResolver,
  ) {
    this.parser = parser;
    this.importExtractor = importExtractor;
    this.moduleResolver = moduleResolver;
    this.itemResolver = itemResolver;
  }

  /**
   * Combines internal and external usage resolution.
   * Precomputes module resolution for each import statement/member.
   */
  public resolveUsage(
    filePath: string,
    rootNode: Parser.SyntaxNode,
  ): UsageResult {
    const importStmts = this.importExtractor.getImportStatements(filePath);
    const nodesToExclude = importStmts.map((stmt) => stmt.node);

    const internalResults = new Map<string, InternalUsageResult>();
    const externalResults: ExternalUsageResult[] = [];

    for (const stmt of importStmts) {
      if (stmt.type === FROM_IMPORT_STATEMENT_TYPE) {
        // For from-import statements, resolve the module once.
        const moduleName = stmt.members[0].identifierNode.text;
        const pythonModule =
          this.moduleResolver.getModuleFromFilePath(filePath);
        const resolvedModule = this.moduleResolver.resolveModule(
          pythonModule,
          moduleName,
        );
        if (resolvedModule) {
          this.processInternalUsageForFromImport(
            stmt,
            rootNode,
            nodesToExclude,
            internalResults,
            resolvedModule,
          );
        } else {
          this.processExternalUsageForFromImport(
            stmt,
            rootNode,
            nodesToExclude,
            externalResults,
            moduleName,
          );
        }
      } else if (stmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
        // For normal imports, process each member individually.
        for (const member of stmt.members) {
          const moduleName = member.identifierNode.text;
          const pythonModule =
            this.moduleResolver.getModuleFromFilePath(filePath);
          const resolvedModule = this.moduleResolver.resolveModule(
            pythonModule,
            moduleName,
          );
          if (resolvedModule) {
            this.processInternalUsageForNormalImportMember(
              member,
              rootNode,
              nodesToExclude,
              internalResults,
              resolvedModule,
            );
          } else {
            this.processExternalUsageForNormalImportMember(
              member,
              rootNode,
              nodesToExclude,
              externalResults,
            );
          }
        }
      }
    }

    return { internal: internalResults, external: externalResults };
  }

  /**
   * Processes FROM_IMPORT statements for internal usage.
   * @param stmt The import statement.
   * @param rootNode The AST root.
   * @param nodesToExclude Nodes to ignore (e.g. import statements).
   * @param internalResults Map to accumulate internal usage.
   * @param moduleName The module name from the statement.
   * @param resolvedModule The resolved internal module.
   */
  private processInternalUsageForFromImport(
    stmt: ImportStatement,
    rootNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    internalResults: Map<string, InternalUsageResult>,
    resolvedModule: PythonModule,
  ) {
    for (const member of stmt.members) {
      if (member.isWildcardImport) {
        // For wildcard imports, use the itemResolver to get all available symbols
        const allSymbols = this.itemResolver.resolveAllSymbols(resolvedModule);

        // Check which symbols are actually used in the code
        for (const [symbolName, resolvedItem] of allSymbols.entries()) {
          const refUsageNodes = this.getrefUsageNodes(
            rootNode,
            nodesToExclude,
            symbolName,
          );
          if (refUsageNodes.length > 0) {
            // Record usage in the module where the symbol is actually defined
            if (resolvedItem.symbol) {
              this.recordInternalUsage(
                internalResults,
                resolvedItem.module,
                resolvedItem.symbol,
              );
            }
          }
        }
      } else if (member.items) {
        for (const item of member.items) {
          const resolvedItem = this.itemResolver.resolveItem(
            resolvedModule,
            item.identifierNode.text,
          );

          // if the item is resolved, it is a symbol
          if (resolvedItem) {
            if (resolvedItem.symbol) {
              const refUsageNodes = this.getrefUsageNodes(
                rootNode,
                nodesToExclude,
                item.aliasNode?.text || item.identifierNode.text,
              );
              if (refUsageNodes.length > 0) {
                this.recordInternalUsage(
                  internalResults,
                  resolvedItem.module,
                  resolvedItem.symbol,
                );
              }
            }
          }

          // if the item is not resolved, it is a submodule
          // we need to check if the submodule is used
          // and if so, we need to check if the symbol is used

          const subModule = this.moduleResolver.resolveModule(
            resolvedModule,
            item.identifierNode.text,
          );
          if (subModule) {
            const refUsageNodes = this.getrefUsageNodes(
              rootNode,
              nodesToExclude,
              item.aliasNode?.text || item.identifierNode.text,
            );
            if (refUsageNodes.length > 0) {
              const symbols = this.itemResolver.resolveAllSymbols(subModule);
              symbols.values().forEach((symbol) => {
                if (symbol.symbol) {
                  const lookupName =
                    (item.aliasNode?.text || item.identifierNode.text) +
                    "." +
                    symbol.symbol.identifierNode.text;
                  const refUsageNodes = this.getrefUsageNodes(
                    rootNode,
                    nodesToExclude,
                    lookupName,
                  );
                  if (refUsageNodes.length > 0) {
                    this.recordInternalUsage(
                      internalResults,
                      symbol.module,
                      symbol.symbol,
                    );
                  }
                }
              });
              // // record the submodule usage
              // // this will not override the potential symbols found above
              // this.recordInternalUsage(internalResults, subModule, undefined);
            }
          }
        }
      }
    }
  }

  /**
   * Processes FROM_IMPORT statements for external usage.
   * @param stmt The import statement.
   * @param rootNode The AST root.
   * @param nodesToExclude Nodes to ignore.
   * @param externalResults Array to accumulate external usage.
   * @param moduleName The module name from the statement.
   */
  private processExternalUsageForFromImport(
    stmt: ReturnType<PythonImportExtractor["getImportStatements"]>[number],
    rootNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    externalResults: ExternalUsageResult[],
    moduleName: string,
  ) {
    let foundUsage = false;
    let symbolNames: string[] | undefined;
    for (const member of stmt.members) {
      if (member.isWildcardImport) {
        const refUsageNodes = this.getrefUsageNodes(
          rootNode,
          nodesToExclude,
          moduleName,
        );
        // we have no way to know which symbol is used
        // so we just record the module usage
        if (refUsageNodes.length > 0) {
          foundUsage = true;
        }
      } else if (member.items) {
        for (const item of member.items) {
          const symbolRefName =
            item.aliasNode?.text || item.identifierNode.text;
          const refUsageNodes = this.getrefUsageNodes(
            rootNode,
            nodesToExclude,
            symbolRefName,
          );
          if (refUsageNodes.length > 0) {
            if (symbolNames === undefined) {
              symbolNames = [];
            }
            symbolNames.push(symbolRefName);
            foundUsage = true;
          }
        }
      }
    }
    if (foundUsage) {
      externalResults.push({
        moduleName,
        symbolNames,
      });
    }
  }

  /**
   * Processes NORMAL_IMPORT member for internal usage.
   * @param member The import member.
   * @param rootNode The AST root.
   * @param nodesToExclude Nodes to ignore.
   * @param internalResults Map to accumulate internal usage.
   * @param resolvedModule The resolved internal module.
   */
  private processInternalUsageForNormalImportMember(
    member: ReturnType<
      PythonImportExtractor["getImportStatements"]
    >[number]["members"][number],
    rootNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    internalResults: Map<string, InternalUsageResult>,
    resolvedModule: PythonModule,
  ) {
    // First check if the module itself is used
    const refUsageNodes = this.getrefUsageNodes(
      rootNode,
      nodesToExclude,
      member.aliasNode?.text || member.identifierNode.text,
    );
    if (refUsageNodes.length > 0) {
      // Then we check if the symbol of the module is used.
      const symbols = this.itemResolver.resolveAllSymbols(resolvedModule);
      symbols.values().forEach((symbol) => {
        if (symbol.symbol) {
          const lookupName =
            (member.aliasNode?.text || member.identifierNode.text) +
            "." +
            symbol.symbol.identifierNode.text;
          const refUsageNodes = this.getrefUsageNodes(
            rootNode,
            nodesToExclude,
            lookupName,
          );
          if (refUsageNodes.length > 0) {
            this.recordInternalUsage(
              internalResults,
              symbol.module,
              symbol.symbol,
            );
          }
        }
      });
      // If the module itself is used but no its symvol, we record it.
      // This will not overide the potential symbols found above.
      this.recordInternalUsage(internalResults, resolvedModule, undefined);
    }
  }

  /**
   * Processes NORMAL_IMPORT member for external usage.
   * @param member The import member.
   * @param rootNode The AST root.
   * @param nodesToExclude Nodes to ignore.
   * @param externalResults Array to accumulate external usage.
   * @param moduleName The module name.
   */
  private processExternalUsageForNormalImportMember(
    member: ReturnType<
      PythonImportExtractor["getImportStatements"]
    >[number]["members"][number],
    rootNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    externalResults: ExternalUsageResult[],
  ) {
    const refName = member.aliasNode?.text || member.identifierNode.text;
    const refUsageNodes = this.getrefUsageNodes(
      rootNode,
      nodesToExclude,
      refName,
    );

    let symbolNames: string[] | undefined;

    // First check if the module itself is used
    if (refUsageNodes.length > 0) {
      // Then we check if the symbol of the module is used.

      // check for symbol usage. For this we can guess them from the refUsageNodes
      refUsageNodes.forEach((node) => {
        if (node.parent && node.parent.type === "attribute") {
          const attributeNode = node.parent.childForFieldName("attribute");
          if (attributeNode) {
            if (symbolNames === undefined) {
              symbolNames = [];
            }
            symbolNames.push(attributeNode.text);
          }
        }
      });

      externalResults.push({
        moduleName: member.identifierNode.text,
        symbolNames,
      });
    }
  }

  /**
   * Helper function to check if a symbol is used in the AST, excluding given nodes.
   */
  private getrefUsageNodes(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    symbolRefName: string,
  ) {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
        ((identifier) @id (#eq? @id "${symbolRefName}"))
        ((attribute) @attr (#eq? @attr "${symbolRefName}"))
      `,
    );
    const captures = query.captures(targetNode);
    return captures
      .filter(({ node }) => !this.isNodeInsideAnyExclude(node, nodesToExclude))
      .map(({ node }) => node);
  }

  /**
   * Records an internal usage result.
   */
  private recordInternalUsage(
    results: Map<string, InternalUsageResult>,
    module: PythonModule,
    symbol: Symbol | undefined,
  ) {
    const key = module.path;
    const existing = results.get(key);
    if (existing) {
      if (
        symbol &&
        existing.symbols &&
        !existing.symbols.some((s) => s.id === symbol.id)
      ) {
        existing.symbols.push(symbol);
      }
    } else {
      results.set(key, {
        moduleNode: module,
        symbols: symbol ? [symbol] : undefined,
      });
    }
  }

  /**
   * Checks if a node is inside any of the excluded nodes.
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
}
