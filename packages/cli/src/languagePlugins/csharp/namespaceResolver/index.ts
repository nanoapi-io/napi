import Parser from "tree-sitter";
import { File, Namespace, ExportedSymbol } from "../types";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export class NamespaceResolver {
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

  getClassesFromNamespaces(namespaces: Namespace[]): ExportedSymbol[] {
    let classes: ExportedSymbol[] = [];
    namespaces.forEach((ns) => {
      classes = classes.concat(ns.classes);
      classes = classes.concat(
        this.getClassesFromNamespaces(ns.childrenNamespaces),
      );
    });
    return classes;
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
  #assignNamespacesToClasses(tree: Namespace, parentNamespace = "") {
    const fullNamespace = parentNamespace
      ? `${parentNamespace}.${tree.name}`
      : tree.name;

    tree.classes.forEach((cls) => {
      cls.namespace = fullNamespace;
    });

    tree.childrenNamespaces.forEach((ns) => {
      this.#assignNamespacesToClasses(ns, fullNamespace);
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
}
