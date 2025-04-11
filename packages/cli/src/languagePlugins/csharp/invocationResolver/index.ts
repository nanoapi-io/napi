import Parser from "tree-sitter";
import { File } from "../namespaceResolver";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";
import { csharpParser } from "../../../helpers/treeSitter/parsers";
import { CSharpUsingResolver, ResolvedImports } from "../usingResolver";
import { CSharpProjectMapper } from "../projectMapper";

/**
 * Query to identify variable names in the file
 */
const variablesQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  (variable_declarator
    name: (identifier) @varname
  )
  (parameter
    name: (identifier) @varname
  )
  `,
);

/**
 * Query to identify classes that are called in the file
 * for object and variable creation
 */
const calledClassesQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  ((object_creation_expression
  type: (identifier) @cls))
  ((object_creation_expression
  type: (qualified_name) @cls))
  (variable_declaration
  type: (identifier) @cls)
  (variable_declaration
  type: (qualified_name) @cls)
  (parameter
  type: (identifier) @cls)
  (parameter
  type: (qualified_name) @cls)
  (type_argument_list
  (identifier) @cls)
  (type_argument_list
  (qualified_name) @cls)
  (attribute
  (identifier) @cls)
  (attribute
  (qualified_name) @cls)
  (base_list
  (identifier) @cls)
  (base_list
  (qualified_name) @cls)
  (property_declaration
  type: (identifier) @cls)
  (generic_name) @cls
  `,
);

/**
 * Query to identify invocation expressions in the file
 * for function or constant calls
 */
const invocationQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  (_
    (member_access_expression
  ))@cls
  `,
);

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
  private cache: Map<string, Invocations> = new Map<string, Invocations>();

  constructor(
    nsMapper: CSharpNamespaceMapper,
    projectmapper: CSharpProjectMapper,
  ) {
    this.nsMapper = nsMapper;
    this.usingResolver = new CSharpUsingResolver(nsMapper, projectmapper);
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
    return variablesQuery.captures(node).map((ctc) => ctc.node.text);
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
    filepath: string,
  ): SymbolNode | null {
    // Remove any generic type information from the classname
    // Classes in the type argument list are managed on their own.
    const cleanClassname = classname.split("<")[0];
    // Try to find the class in the resolved imports
    const ucls = this.usingResolver.findClassInImports(
      this.resolvedImports,
      cleanClassname,
      filepath,
    );
    if (ucls) {
      return ucls;
    }
    // Try to find the class in the namespace tree
    const cls = this.nsMapper.findClassInTree(namespaceTree, cleanClassname);
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
    filepath: string,
  ): Invocations {
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Query to capture object creation expressions and variable declarations
    const catches = calledClassesQuery.captures(node);
    // Process each captured class name
    catches.forEach((ctc) => {
      const classname = ctc.node.text;
      const resolvedSymbol = this.resolveSymbol(
        classname,
        namespaceTree,
        filepath,
      );
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
    filepath: string,
  ): Invocations {
    // Get variable names to filter out variable-based invocations
    const variablenames = this.#getVariables(node);
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Query to capture invocation expressions
    const catches = invocationQuery.captures(node);
    // Process each captured access expression
    catches.forEach((ctc) => {
      // Remove intermediate members (e.g., System.Mario in System.Mario.Bros)
      if (ctc.node.type === "member_access_expression") return;
      // Get the root member access expression
      const mae = ctc.node.children.find(
        (child) => child.type === "member_access_expression",
      );
      // There should be one according to the query, but safety first.
      if (!mae) return;
      const func = mae.text;
      // Among all the matches, even the functions dont have parentheses
      // That means that nodes with parentheses in it are intermediate members
      // They get through the net because their type is invocation_expression.
      if (func.includes("(")) return;
      // The query gives us a full invocation,
      // but we only want a class or namespace name.
      const funcParts = func.split(".");
      const classname = funcParts.slice(0, -1).join(".");
      // If the function is called from a variable, then we ignore it.
      // (Because the dependency will already be managed by the variable creation)
      if (variablenames.includes(classname)) {
        return;
      }
      const resolvedSymbol = this.resolveSymbol(
        classname,
        namespaceTree,
        filepath,
      );
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
   * Gets the invocations from a file.
   * @param filepath - The path of the file to analyze.
   * @returns An object containing resolved and unresolved symbols.
   */
  getInvocationsFromFile(filepath: string): Invocations {
    if (this.cache.has(filepath)) {
      return this.cache.get(filepath) as Invocations;
    }
    const file: File | undefined = this.nsMapper.getFile(filepath);
    if (!file) {
      return {
        resolvedSymbols: [],
        unresolved: [],
      };
    }
    const invocations = this.getInvocationsFromNode(file.rootNode, filepath);
    this.cache.set(filepath, invocations);
    return invocations;
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
    const calledClasses = this.#getCalledClasses(
      node,
      this.nsMapper.nsTree,
      filepath,
    );
    // Resolve invocation expressions
    const invocationExpressions = this.#resolveInvocationExpressions(
      node,
      this.nsMapper.nsTree,
      filepath,
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

  /**
   * Checks if a symbol is used in a file.
   * @param filepath - The path of the file to check.
   * @param symbol - The symbol to check for.
   * @returns True if the symbol is used in the file, false otherwise.
   */
  public isUsedInFile(filepath: string, symbol: SymbolNode): boolean {
    const invocations = this.getInvocationsFromFile(filepath);
    return invocations.resolvedSymbols.some((inv) => inv.name === symbol.name);
  }
}
