import Parser from "tree-sitter";
import { File } from "../namespaceResolver";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export class CSharpDependencyResolver {
  parser: Parser = csharpParser;
  private nsMapper: CSharpNamespaceMapper;

  constructor(nsMapper: CSharpNamespaceMapper) {
    this.nsMapper = nsMapper;
  }

  // Gets the classes used in a file.
  // Query may have to be updated to include more cases.
  #getCalledClasses(
    node: Parser.SyntaxNode,
    namespaceTree: NamespaceNode,
  ): SymbolNode[] {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        ((invocation_expression
          function:
              (member_access_expression
                  expression: (identifier) @classname
        )))
        ((object_creation_expression
          type: (identifier) @classname
        ))
        (variable_declaration
          type: (identifier) @classname
        )
        (qualified_name
          qualifier: (identifier)
          name: (identifier)
        ) @qual_name
      `,
    )
      .captures(node)
      .map((capture) => {
        const className = capture.node.text;
        return this.nsMapper.findClassInTree(namespaceTree, className);
      })
      .filter((cls): cls is SymbolNode => cls !== null);
  }

  // Gets the classes used in a file.
  getDependenciesFromFile(file: File): SymbolNode[] {
    return this.#getCalledClasses(file.rootNode, this.nsMapper.nsTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }

  getDependenciesFromNode(node: Parser.SyntaxNode): SymbolNode[] {
    return this.#getCalledClasses(node, this.nsMapper.nsTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }
}
