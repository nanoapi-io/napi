import Parser from "tree-sitter";
import { PythonModule, PythonModuleResolver } from "../moduleResolver";
import { Symbol } from "../exportExtractor";
import {
  FROM_IMPORT_STATEMENT_TYPE,
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
      if (stmt.type === FROM_IMPORT_STATEMENT_TYPE && stmt.sourceNode) {
        // For from-import statements, resolve the module once.
        const moduleName = stmt.sourceNode.text;
        const resolvedModule = this.moduleResolver.resolveModule(
          filePath,
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
          const resolvedModule = this.moduleResolver.resolveModule(
            filePath,
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
              moduleName,
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
   * @param resolvedModule The resolved internal module.
   */
  private processInternalUsageForFromImport(
    stmt: ReturnType<PythonImportExtractor["getImportStatements"]>[number],
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
          if (this.isSymbolUsed(rootNode, nodesToExclude, symbolName)) {
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
          if (
            resolvedItem &&
            resolvedItem.symbol &&
            this.isSymbolUsed(
              rootNode,
              nodesToExclude,
              item.aliasNode?.text || item.identifierNode.text,
            )
          ) {
            this.recordInternalUsage(
              internalResults,
              resolvedItem.module,
              resolvedItem.symbol,
            );
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
    const usedSymbols: string[] = [];
    for (const member of stmt.members) {
      if (member.isWildcardImport) {
        if (this.isSymbolUsed(rootNode, nodesToExclude, moduleName)) {
          foundUsage = true;
        }
      } else if (member.items) {
        for (const item of member.items) {
          const symbolRefName =
            item.aliasNode?.text || item.identifierNode.text;
          if (this.isSymbolUsed(rootNode, nodesToExclude, symbolRefName)) {
            usedSymbols.push(symbolRefName);
            foundUsage = true;
          }
        }
      }
    }
    if (foundUsage) {
      externalResults.push({
        moduleName,
        symbolNames: usedSymbols.length > 0 ? usedSymbols : undefined,
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
    const moduleName = member.identifierNode.text;
    if (
      this.isSymbolUsed(
        rootNode,
        nodesToExclude,
        member.aliasNode?.text || moduleName,
      )
    ) {
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
    moduleName: string,
  ) {
    const refName = member.aliasNode?.text || moduleName;
    if (this.isSymbolUsed(rootNode, nodesToExclude, refName)) {
      externalResults.push({
        moduleName,
        symbolNames: undefined,
      });
    }
  }

  /**
   * Helper function to check if a symbol is used in the AST, excluding given nodes.
   */
  private isSymbolUsed(
    targetNode: Parser.SyntaxNode,
    nodesToExclude: Parser.SyntaxNode[],
    symbolRefName: string,
  ): boolean {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `((identifier) @id (#eq? @id "${symbolRefName}"))`,
    );
    const captures = query.captures(targetNode);
    return captures.some(
      ({ node }) => !this.isNodeInsideAnyExclude(node, nodesToExclude),
    );
  }

  /**
   * Records an internal usage result.
   */
  private recordInternalUsage(
    results: Map<string, InternalUsageResult>,
    module: PythonModule,
    symbol: Symbol | undefined,
  ) {
    const key = module.path || module.fullName;
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
