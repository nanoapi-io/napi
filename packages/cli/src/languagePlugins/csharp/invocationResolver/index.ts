import Parser from "tree-sitter";
import { File } from "../namespaceResolver";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";
import { csharpParser } from "../../../helpers/treeSitter/parsers";
import { CSharpUsingResolver, ResolvedImports } from "../usingResolver";

export interface Invocations {
  resolvedSymbols: SymbolNode[];
  unresolved: string[];
}

export class CSharpInvocationResolver {
  parser: Parser = csharpParser;
  private nsMapper: CSharpNamespaceMapper;
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

  // Retrieves variable names from the given syntax node.
  #getVariables(node: Parser.SyntaxNode): string[] {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
      (variable_declarator
        name: (identifier) @varname
      )
      `,
    )
      .captures(node)
      .map((ctc) => ctc.node.text);
  }

  // Gets the classes that are called for variable declarations and object creations.
  // This does not manage static calls such as System.Math.Abs(-1).
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
      `,
    ).captures(node);
    // Process each captured class name
    catches.forEach((ctc) => {
      const classname = ctc.node.text;
      // Try to find the class in the resolved imports
      const ucls = this.usingResolver.findClassInImports(
        this.resolvedImports,
        classname,
      );
      if (ucls) {
        invocations.resolvedSymbols.push(ucls);
        return;
      }
      // Try to find the class in the namespace tree
      const cls = this.nsMapper.findClassInTree(namespaceTree, classname);
      if (cls) {
        invocations.resolvedSymbols.push(cls);
      } else {
        // If class not found, mark as unresolved
        invocations.unresolved.push(classname);
      }
    });
    return invocations;
  }

  // Resolves invocation expressions within the given syntax node.
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
      // Try to find the class in the resolved imports
      const ucls = this.usingResolver.findClassInImports(
        this.resolvedImports,
        classname,
      );
      if (ucls) {
        invocations.resolvedSymbols.push(ucls);
        return;
      }
      // Try to find the class in the namespace tree
      const cls = this.nsMapper.findClassInTree(namespaceTree, classname);
      if (cls) {
        invocations.resolvedSymbols.push(cls);
      } else {
        // If class not found, mark as unresolved
        invocations.unresolved.push(classname);
      }
    });
    return invocations;
  }

  // Gets the classes used in a file.
  getInvocationsFromFile(filepath: string): Invocations {
    this.resolvedImports = this.usingResolver.resolveUsingDirectives(filepath);
    const file = this.nsMapper.getFile(filepath) as File;
    const invocations: Invocations = {
      resolvedSymbols: [],
      unresolved: [],
    };
    // Get classes called in variable declarations and object creations
    const calledClasses = this.#getCalledClasses(
      file.rootNode,
      this.nsMapper.nsTree,
    );
    // Resolve invocation expressions
    const invocationExpressions = this.#resolveInvocationExpressions(
      file.rootNode,
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
}
