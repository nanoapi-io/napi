import Parser from "tree-sitter";
import { CSharpNamespaceResolver, SymbolType } from "../namespaceResolver";

export interface NamespaceNode {
  name: string;
  exports: SymbolNode[];
  childrenNamespaces: NamespaceNode[];
}

export interface SymbolNode {
  name: string;
  type: SymbolType;
  namespace: string; // Kept for ambiguity resolution
  filepath: string;
}

export class CSharpNamespaceMapper {
  #files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #namespaces: NamespaceNode[] = [];
  #nsResolver: CSharpNamespaceResolver;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.#files = files;
    this.#nsResolver = new CSharpNamespaceResolver();
  }

  // Adds a namespace to the final tree.
  #addNamespaceToTree(namespace: NamespaceNode, tree: NamespaceNode) {
    // Deconstruct the namespace's name, so that A.B
    // becomes B, child of A.
    const parts = namespace.name.split(".");
    let current = tree;

    // For each part of the namespace, we check if it's
    // already in the tree. If it is, we go to the next
    // part. If it isn't, we add it to the tree.
    if (namespace.name !== "") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      parts.forEach((part, _) => {
        let child = current.childrenNamespaces.find((ns) => ns.name === part);
        if (!child) {
          child = {
            name: part,
            exports: [],
            childrenNamespaces: [],
          };
          current.childrenNamespaces.push(child);
        }
        current = child;
      });
    }

    // Once we're done with the parts, we add the classes
    // and children namespaces to the current namespace.
    current.exports.push(...namespace.exports);
    current.childrenNamespaces.push(...namespace.childrenNamespaces);
  }

  // Assigns namespaces to classes, used for ambiguity resolution.
  // check 2Namespaces1File.cs for an example.
  #assignNamespacesToClasses(tree: NamespaceNode, parentNamespace = "") {
    const fullNamespace = parentNamespace
      ? `${parentNamespace}.${tree.name}`
      : tree.name;

    tree.exports.forEach((cls) => {
      cls.namespace = fullNamespace;
    });

    tree.childrenNamespaces.forEach((ns) => {
      this.#assignNamespacesToClasses(ns, fullNamespace);
    });
  }

  // Builds a tree of namespaces from the parsed files.
  buildNamespaceTree(): NamespaceNode {
    const namespaceTree: NamespaceNode = {
      name: "",
      exports: [],
      childrenNamespaces: [],
    };

    // Parse all files.
    this.#files.forEach((file) => {
      this.#namespaces = this.#namespaces.concat(
        this.#nsResolver
          .getNamespacesFromFile(file)
          .map((ns) => ns as NamespaceNode),
      );
    });

    // Add all namespaces to the tree.
    this.#namespaces.forEach((namespace) => {
      this.#addNamespaceToTree(namespace, namespaceTree);
    });

    // Assign namespaces to classes.
    this.#assignNamespacesToClasses(namespaceTree);

    // I don't understand why, but the root element is always empty
    return namespaceTree;
  }
}
