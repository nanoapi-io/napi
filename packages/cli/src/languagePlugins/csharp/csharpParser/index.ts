import Parser from "tree-sitter";
import { File, Namespace, ExportedSymbol } from "./types";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export class CSharpPlugin {
  parser: Parser = csharpParser;
  #files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #currentFile: string;
  #namespaces: Namespace[] = [];

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.#currentFile = "";
    this.#files = files;
  }

  // Parses namespaces from a file along with the exported classes
  getNamespacesFromFile(file: File): Namespace[] {
    this.#currentFile = file.path;
    return this.#getNamespacesFromRootNode(file.rootNode);
  }

  // Parses namespaces from the root node of a file
  // Needed as some classes aren't in a namespace,
  // so we start with the "" namespace.
  #getNamespacesFromRootNode(node: Parser.SyntaxNode): Namespace[] {
    return [
      {
        name: "",
        classes: this.#getClassesFromNode(node),
        childrenNamespaces: this.#getNamespacesFromNode(node),
      },
    ];
  }

  // Recursively parses namespaces from a node
  #getNamespacesFromNode(node: Parser.SyntaxNode): Namespace[] {
    return node.children
      .filter((child) => child.type === "namespace_declaration")
      .map((child) => ({
        name: this.#getName(child),
        classes: this.#getClassesFromNode(this.#getDeclarationList(child)),
        childrenNamespaces: this.#getNamespacesFromNode(
          this.#getDeclarationList(child),
        ),
      }));
  }

  // Gets the declaration list from a node
  // i.e. where the classes, namespaces and methods are declared
  #getDeclarationList(node: Parser.SyntaxNode): Parser.SyntaxNode {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (declaration_list) @body
      `,
    ).captures(node)[0].node;
  }

  // Gets the name from a node
  #getName(node: Parser.SyntaxNode): string {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (identifier) @name
        (qualified_name) @name
      `,
    ).captures(node)[0].node.text;
  }

  // Gets the classes, structs and enums from a node
  #getClassesFromNode(node: Parser.SyntaxNode): ExportedSymbol[] {
    return (
      node.children
        .filter(
          (child) =>
            child.type === "class_declaration" ||
            child.type === "struct_declaration" ||
            child.type === "enum_declaration",
        )
        // Missing interface_declaration, idk if it's needed
        .map((child) => ({
          name: this.#getName(child),
          type: child.type.replace("_declaration", ""),
          node: child,
          filepath: this.#currentFile,
        }))
    );
  }

  // Adds a namespace to the final tree.
  #addNamespaceToTree(namespace: Namespace, tree: Namespace) {
    // Deconstruct the namespace's name, so that A.B
    // becomes B, child of A.
    const parts = namespace.name.split(".");
    let current = tree;

    // For each part of the namespace, we check if it's
    // already in the tree. If it is, we go to the next
    // part. If it isn't, we add it to the tree.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parts.forEach((part, _) => {
      let child = current.childrenNamespaces.find((ns) => ns.name === part);
      if (!child) {
        child = {
          name: part,
          classes: [],
          childrenNamespaces: [],
        };
        current.childrenNamespaces.push(child);
      }
      current = child;
    });

    // Once we're done with the parts, we add the classes
    // and children namespaces to the current namespace.
    current.classes.push(...namespace.classes);
    current.childrenNamespaces.push(...namespace.childrenNamespaces);
  }

  // Assigns namespaces to classes, used for ambiguity resolution.
  // check 2Namespaces1File.cs for an example.
  #assignNamespacesToClasses(tree: Namespace) {
    tree.classes.forEach((cls) => {
      cls.namespace = tree.name;
    });

    tree.childrenNamespaces.forEach((ns) => {
      ns.classes.forEach((cls) => {
        cls.namespace = ns.name;
      });
      this.#assignNamespacesToClasses(ns);
    });
  }

  // Builds a tree of namespaces from the parsed files.
  buildNamespaceTree(): Namespace {
    const namespaceTree: Namespace = {
      name: "",
      classes: [],
      childrenNamespaces: [],
    };

    // Parse all files.
    this.#files.forEach((file) => {
      this.#namespaces = this.#namespaces.concat(
        this.getNamespacesFromFile(file),
      );
    });

    // Add all namespaces to the tree.
    this.#namespaces.forEach((namespace) => {
      this.#addNamespaceToTree(namespace, namespaceTree);
    });

    // Assign namespaces to classes.
    this.#assignNamespacesToClasses(namespaceTree);

    // I don't understand why, but the root element is always empty
    return namespaceTree.childrenNamespaces[0];
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
          namespace.classes.find((cls) => cls.name === simpleClassName) ?? null
        );
      } else {
        // In case the qualifier is actually not a namespace but a class
        // Check OuterInnerClass in the tests.
        return this.#findClassInTree(tree, namespaceName);
      }
    }
    // Find the class in the current node's classes.
    if (tree.classes.some((cls) => cls.name === className)) {
      return tree.classes.find((cls) => cls.name === className) ?? null;
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
        return (
          this.#findClassInTree(namespaceTree, className) ?? {
            name: className,
            type: "class", // Inaccurate, here for placeholder.
            node: capture.node, // Inaccurate, here for placeholder.
            filepath: "",
          }
        );
      });
  }

  // Gets the classes used in a file.
  getDependenciesFromFile(
    namespaceTree: Namespace,
    file: File,
  ): ExportedSymbol[] {
    return this.#getCalledClasses(file.rootNode, namespaceTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }

  getDependenciesFromNode(
    namespaceTree: Namespace,
    node: Parser.SyntaxNode,
  ): ExportedSymbol[] {
    return this.#getCalledClasses(node, namespaceTree)
      .filter((cls) => cls.filepath !== "")
      .filter(
        (cls, index, self) =>
          self.findIndex(
            (c) => c.name === cls.name && c.namespace === cls.namespace,
          ) === index,
      );
  }
}
