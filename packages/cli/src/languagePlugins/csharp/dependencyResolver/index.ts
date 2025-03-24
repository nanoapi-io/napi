import Parser from "tree-sitter";
import { File, Namespace, ExportedSymbol } from "../types";
import { NamespaceResolver } from "../namespaceResolver";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export class DependencyResolver {
  parser: Parser = csharpParser;
  private nsTree: Namespace;

  constructor(nsResolver: NamespaceResolver) {
    this.nsTree = nsResolver.buildNamespaceTree();
  }

  #findNamespaceInTree(
    tree: Namespace,
    namespaceName: string,
  ): Namespace | null {
    if (namespaceName.includes(".")) {
      const parts = namespaceName.split(".");
      const simpleNamespaceName = parts[0];
      const rest = parts.slice(1).join(".");

      const namespace = tree.childrenNamespaces.find(
        (ns) => ns.name === simpleNamespaceName,
      );
      if (namespace) {
        return this.#findNamespaceInTree(namespace, rest);
      }
    }

    return (
      tree.childrenNamespaces.find((ns) => ns.name === namespaceName) ?? null
    );
  }

  #findClassInTree(tree: Namespace, className: string): ExportedSymbol | null {
    // Management of qualified names
    if (className.includes(".")) {
      const parts = className.split(".");
      const namespaceName = parts.slice(0, -1).join(".");
      const simpleClassName = parts[parts.length - 1];

      const namespace = this.#findNamespaceInTree(tree, namespaceName);
      if (namespace) {
        return (
          namespace.exports.find((cls) => cls.name === simpleClassName) ?? null
        );
      } else {
        // In case the qualifier is actually not a namespace but a class
        // Check OuterInnerClass in the tests.
        return this.#findClassInTree(this.nsTree, namespaceName);
      }
    }
    // Find the class in the current node's classes.
    if (tree.exports.some((cls) => cls.name === className)) {
      return tree.exports.find((cls) => cls.name === className) ?? null;
    }

    // Recursively search in children namespaces.
    for (const namespace of tree.childrenNamespaces) {
      const found = this.#findClassInTree(namespace, className);
      if (found) {
        return found;
      }
    }

    return null;
  }

  // Gets the classes used in a file.
  // Query may have to be updated to include more cases.
  #getCalledClasses(
    node: Parser.SyntaxNode,
    namespaceTree: Namespace,
  ): ExportedSymbol[] {
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
        return this.#findClassInTree(namespaceTree, className);
      })
      .filter((cls): cls is ExportedSymbol => cls !== null);
  }

  // Gets the classes used in a file.
  getDependenciesFromFile(file: File): ExportedSymbol[] {
    return this.#getCalledClasses(file.rootNode, this.nsTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }

  getDependenciesFromNode(node: Parser.SyntaxNode): ExportedSymbol[] {
    return this.#getCalledClasses(node, this.nsTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }
}
