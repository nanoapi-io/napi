import Parser from "tree-sitter";
import { File } from "../namespaceResolver";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";
import { csharpParser } from "../../../helpers/treeSitter/parsers";
import { CSharpUsingResolver, ResolvedImports } from "../usingResolver";

/**
 * Interface representing the invocations in a file
 */
export interface Invocations {
  /** List of resolved symbols */
  resolvedSymbols: SymbolNode[];
  /** List of unresolved symbols (usually external imports) */
  unresolved: string[];
}

export class CSharpInvocationResolver {
  parser: Parser = csharpParser;
  public nsMapper: CSharpNamespaceMapper;
  private usingResolver: CSharpUsingResolver;
  private resolvedImports: ResolvedImports;

  constructor(nsMapper: CSharpNamespaceMapper) {
    this.nsMapper = nsMapper;
    this.usingResolver = new CSharpUsingResolver(nsMapper);
    this.resolvedImports = {
      internal: [],
      external: [],
    };
  }

  /**
   * Retrieves variable names from the given syntax node.
   * @param node - The syntax node to extract variable names from.
   * @returns An array of variable names.
   */
  #getVariables(node: Parser.SyntaxNode): string[] {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
      (variable_declarator
        name: (identifier) @varname
      )
      (parameter
        name: (identifier) @varname
      )
      `,
    )
      .captures(node)
      .map((ctc) => ctc.node.text);
  }

  /**
   * Resolves a symbol (class or namespace) from the given classname.
   * @param classname - The name of the class to resolve.
   * @param namespaceTree - The namespace tree to search within.
   * @returns The resolved symbol node or null if not found.
   */
  private resolveSymbol(
    classname: string,
    namespaceTree: NamespaceNode,
  ): SymbolNode | null {
    // Try to find the class in the resolved imports
    const ucls = this.usingResolver.findClassInImports(
      this.resolvedImports,
      classname,
    );
    if (ucls) {
      return ucls;
    }
    // Try to find the class in the namespace tree
    const cls = this.nsMapper.findClassInTree(namespaceTree, classname);
    if (cls) {
      return cls;
    }
    return null;
  }

  /**
   * Gets the classes that are called for variable declarations and object creations.
   * This does not manage static calls such as System.Math.Abs(-1).
   * @param node - The syntax node to analyze.
   * @param namespaceTree - The namespace tree to search within.
   * @returns An object containing resolved and unresolved symbols.
   */
  #getCalledClasses(
    node: Parser.SyntaxNode,
    namespaceTree: NamespaceNode,
  ): Invocations {
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Query to capture object creation expressions and variable declarations
    const catches = new Parser.Query(
      this.parser.getLanguage(),
      `
      ((object_creation_expression
        type: (identifier) @classname
      ))
      ((object_creation_expression
        type: (qualified_name) @classname
      ))
      (variable_declaration
        type: (identifier) @classname
      )
      (variable_declaration
        type: (qualified_name) @classname
      )
      (parameter
        type: (identifier) @classname
      )
      (parameter
        type: (qualified_name) @classname
      )
      `,
    ).captures(node);
    // Process each captured class name
    catches.forEach((ctc) => {
      const classname = ctc.node.text;
      const resolvedSymbol = this.resolveSymbol(classname, namespaceTree);
      if (resolvedSymbol) {
        invocations.resolvedSymbols.push(resolvedSymbol);
      } else {
        // If class not found, mark as unresolved
        invocations.unresolved.push(classname);
      }
    });
    return invocations;
  }

  /**
   * Resolves invocation expressions within the given syntax node.
   * @param node - The syntax node to analyze.
   * @param namespaceTree - The namespace tree to search within.
   * @returns An object containing resolved and unresolved symbols.
   */
  #resolveInvocationExpressions(
    node: Parser.SyntaxNode,
    namespaceTree: NamespaceNode,
  ): Invocations {
    // Get variable names to filter out variable-based invocations
    const variablenames = this.#getVariables(node);
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Query to capture invocation expressions
    const catches = new Parser.Query(
      this.parser.getLanguage(),
      `
      (expression_statement
        (invocation_expression) @func
      )
      `,
    ).captures(node);
    // Process each captured function invocation
    catches.forEach((ctc) => {
      const func = ctc.node.text;
      // The query gives us a full function invocation,
      // but we only want a class or namespace name.
      const funcParts = func.split(".").filter((part) => !part.includes("("));
      const classname = funcParts.join(".");
      // If the function is called from a variable, then we ignore it.
      if (variablenames.includes(classname)) {
        return;
      }
      const resolvedSymbol = this.resolveSymbol(classname, namespaceTree);
      if (resolvedSymbol) {
        invocations.resolvedSymbols.push(resolvedSymbol);
      } else {
        // If class not found, mark as unresolved
        invocations.unresolved.push(classname);
      }
    });
    return invocations;
  }

  getInvocationsFromFile(filepath: string): Invocations {
    const file: File | undefined = this.nsMapper.getFile(filepath);
    if (!file) {
      return {
        resolvedSymbols: [],
        unresolved: [],
      };
    }
    return this.getInvocationsFromNode(file.rootNode, filepath);
  }

  /**
   * Gets the classes used in a file.
   * @param node - The syntax node to analyze.
   * @param filepath - The path of the file being analyzed.
   * @returns An object containing resolved and unresolved symbols.
   */
  getInvocationsFromNode(
    node: Parser.SyntaxNode,
    filepath: string,
  ): Invocations {
    this.resolvedImports = this.usingResolver.resolveUsingDirectives(filepath);
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Get classes called in variable declarations and object creations
    const calledClasses = this.#getCalledClasses(node, this.nsMapper.nsTree);
    // Resolve invocation expressions
    const invocationExpressions = this.#resolveInvocationExpressions(
      node,
      this.nsMapper.nsTree,
    );

    // Combine results from both methods, ensuring uniqueness with Set
    invocations.resolvedSymbols = [
      ...new Set([
        ...calledClasses.resolvedSymbols,
        ...invocationExpressions.resolvedSymbols,
      ]),
    ];
    invocations.unresolved = [
      ...new Set([
        ...calledClasses.unresolved,
        ...invocationExpressions.unresolved,
      ]),
    ];
    return invocations;
  }

  public isUsedInFile(filepath: string, symbol: SymbolNode): boolean {
    const invocations = this.getInvocationsFromFile(filepath);
    return invocations.resolvedSymbols.some((inv) => inv.name === symbol.name);
  }
}
