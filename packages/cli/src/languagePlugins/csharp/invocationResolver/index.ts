import Parser from "tree-sitter";
import { File } from "../namespaceResolver/index.js";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper/index.js";
import { csharpParser } from "../../../helpers/treeSitter/parsers.js";
import {
  CSharpUsingResolver,
  ExternalSymbol,
  ResolvedImports,
  UsingDirective,
} from "../usingResolver/index.js";
import { CSharpProjectMapper } from "../projectMapper/index.js";
import {
  CSharpExtensionResolver,
  ExtensionMethod,
  ExtensionMethodMap,
} from "../extensionResolver/index.js";

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
  (object_creation_expression
  type: (identifier) @cls)
  (object_creation_expression
  type: (qualified_name) @cls)
  ((object_creation_expression
  type: (generic_name) @cls))
  (variable_declaration
  type: (identifier) @cls)
  (variable_declaration
  type: (qualified_name) @cls)
  (variable_declaration
  type: (generic_name) @cls)
  (parameter
  type: (identifier) @cls)
  (parameter
  type: (qualified_name) @cls)
  (parameter
  type: (generic_name) @cls)
  (type_argument_list
  (identifier) @cls)
  (type_argument_list
  (qualified_name) @cls)
  (type_argument_list
  (generic_name) @cls)
  (base_list
  (identifier) @cls)
  (base_list
  (qualified_name) @cls)
  (base_list
  (generic_name) @cls)
  (property_declaration
  type: (qualified_name) @cls)
  (property_declaration
  type: (identifier) @cls)
  (property_declaration
  type: (generic_name) @cls)
  (typeof_expression
  type: (_) @cls)
  (method_declaration
  returns: (qualified_name) @cls)
  (method_declaration
  returns: (identifier) @cls)
  (method_declaration
  returns: (generic_name) @cls)
  (array_type
  type: (identifier) @cls)
  (array_type
  type: (qualified_name) @cls)
  (array_type
  type: (generic_name) @cls)
  (nullable_type
  type: (identifier) @cls)
  (nullable_type
  type: (qualified_name) @cls)
  (nullable_type
  type: (generic_name) @cls)
  `,
);

/**
 * Query to identify member accesses in the file
 * for function or constant calls
 */
const memberAccessQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  (_
    (member_access_expression
  ))@cls
  `,
);

/**
 * Query to identify attribute uses in the file
 */
const attributeQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  (attribute
  name: (_) @cls)
  `,
);

/**
 * Query to identify invocation expressions in the file
 * exclusively for function calls
 */
const invocationQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  (invocation_expression
      function: (member_access_expression
      name: (_) @cls
    ))
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
  public usingResolver: CSharpUsingResolver;
  private extensions: ExtensionMethodMap = {};
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
    this.extensions = new CSharpExtensionResolver(nsMapper).getExtensions();
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
   * Resolves member accesses within the given syntax node.
   * @param node - The syntax node to analyze.
   * @param namespaceTree - The namespace tree to search within.
   * @returns An object containing resolved and unresolved symbols.
   */
  #resolveMemberAccesses(
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
    const catches = memberAccessQuery.captures(node);
    // Process each captured access expression
    catches.forEach((ctc) => {
      // Remove intermediate members (e.g., System.Mario in System.Mario.Bros)
      if (ctc.node.type === "member_access_expression") return;
      // Get the root member access expression
      const mae = ctc.node.children.filter(
        (child) => child.type === "member_access_expression",
      );
      let func = mae.map((m) => m.text);
      // Among all the matches, even the functions dont have parentheses
      // That means that nodes with parentheses in it are intermediate members
      // They get through the net because their type is invocation_expression.
      func = func.filter((f) => !f.includes("("));
      func.forEach((f) => {
        // The query gives us a full invocation,
        // but we only want a class or namespace name for the called class.
        const funcParts = f.split(".");
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
    });
    return invocations;
  }

  /**
   * Resolves extension uses within the given syntax node.
   * @param node - The syntax node to analyze.
   * @param namespaceTree - The namespace tree to search within.
   * @returns An object containing resolved classes the extensions come from.
   */
  #resolveExtensionUses(
    node: Parser.SyntaxNode,
    filepath: string,
  ): Invocations {
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    const catches = invocationQuery.captures(node);
    catches.forEach((ctc) => {
      let method = ctc.node.text;
      if (ctc.node.type === "generic_name") {
        const index = method.indexOf("<");
        method = method.substring(0, index);
      }
      const extMethods = this.#findExtension(method, filepath);
      for (const extMethod of extMethods) {
        // TODO : check if there is the correct amount of type arguments
        invocations.resolvedSymbols.push(extMethod.symbol);
      }
    });
    return invocations;
  }

  #resolveAttributeUses(
    node: Parser.SyntaxNode,
    filepath: string,
  ): Invocations {
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    const catches = attributeQuery.captures(node);
    catches.forEach((ctc) => {
      let method = ctc.node.text;
      if (ctc.node.type === "generic_name") {
        const index = method.indexOf("<");
        method = method.substring(0, index);
      }
      const resolvedSymbol = this.resolveSymbol(
        method,
        this.nsMapper.nsTree,
        filepath,
      );
      if (resolvedSymbol) {
        invocations.resolvedSymbols.push(resolvedSymbol);
      } else {
        // If class not found, try again by adding "Attribute" to the name
        const resolvedSymbol = this.resolveSymbol(
          method + "Attribute",
          this.nsMapper.nsTree,
          filepath,
        );
        if (resolvedSymbol) {
          invocations.resolvedSymbols.push(resolvedSymbol);
        } else {
          // If class not found, mark as unresolved
          invocations.unresolved.push(ctc.node.text);
        }
      }
    });
    return invocations;
  }

  /**
   * Finds an extension among the available extension methods.
   * The available extension methods are only in used namespaces.
   * @param ext - The extension method to find.
   * @returns The resolved symbol node or null if not found.
   */
  #findExtension(ext: string, filepath: string): ExtensionMethod[] {
    const methods: ExtensionMethod[] = [];
    const usedNamespaces =
      this.usingResolver.resolveUsingDirectives(filepath).internal;
    // Check if the extension method is in the extensions map
    for (const ns of usedNamespaces) {
      if (
        ns.namespace &&
        this.extensions[this.nsMapper.getFullNSName(ns.namespace)]
      ) {
        const extensions =
          this.extensions[this.nsMapper.getFullNSName(ns.namespace)];
        const extMethods = extensions.filter((method) => method.name === ext);
        if (extMethods.length > 0) {
          methods.push(...extMethods);
        }
      }
    }
    return methods;
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
    // Resolve member accesses expressions
    const memberAccesses = this.#resolveMemberAccesses(
      node,
      this.nsMapper.nsTree,
      filepath,
    );
    // Resolve extension uses
    const extensions = this.#resolveExtensionUses(node, filepath);
    // Resolve attribute uses
    const attributes = this.#resolveAttributeUses(node, filepath);

    // Combine results from both methods, ensuring uniqueness with Set
    invocations.resolvedSymbols = [
      ...new Set([
        ...calledClasses.resolvedSymbols,
        ...memberAccesses.resolvedSymbols,
        ...extensions.resolvedSymbols,
        ...attributes.resolvedSymbols,
      ]),
    ];
    invocations.unresolved = [
      ...new Set([
        ...calledClasses.unresolved,
        ...memberAccesses.unresolved,
        ...extensions.unresolved,
        ...attributes.unresolved,
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

  /**
   * Checks if a using directive is useful in a file.
   * @param invocations - The invocations in the file.
   * @param using - The using directive to check for.
   * @returns True if the using directive is useful, false otherwise.
   */
  public isUsingUseful(
    invocations: Invocations,
    usingD: UsingDirective,
  ): boolean {
    const usedNamespace = this.usingResolver.resolveUsingDirective(usingD);
    if (usedNamespace instanceof ExternalSymbol) return true;
    return invocations.resolvedSymbols.some(
      (inv) =>
        (usedNamespace.namespace &&
          inv.namespace ===
            this.nsMapper.getFullNSName(usedNamespace.namespace)) ||
        (usedNamespace.symbol && inv.name === usedNamespace.symbol.name) ||
        (usedNamespace.symbol &&
          inv.parent &&
          inv.parent.name === usedNamespace.symbol.name),
    );
  }
}
