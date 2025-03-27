import Parser from "tree-sitter";
import { CSharpNamespaceResolver, SymbolType } from "../namespaceResolver";

/**
 * Interface representing a namespace node in the namespace tree.
 */
export interface NamespaceNode {
  /** The name of the namespace */
  name: string;
  /** List of classes and types exported by the namespace */
  exports: SymbolNode[];
  /** List of child namespaces */
  childrenNamespaces: NamespaceNode[];
}

/**
 * Interface representing a symbol node in the namespace tree.
 */
export interface SymbolNode {
  /** The name of the symbol */
  name: string;
  /** The type of the symbol (class, interface, etc.) */
  type: SymbolType;
  /** Kept for ambiguity resolution */
  namespace: string;
  /** The file path where the symbol is defined */
  filepath: string;
  /** The syntax node corresponding to the symbol */
  node: Parser.SyntaxNode;
}

export class CSharpNamespaceMapper {
  #files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #nsResolver: CSharpNamespaceResolver;
  nsTree: NamespaceNode;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.#files = files;
    this.#nsResolver = new CSharpNamespaceResolver();
    this.nsTree = this.buildNamespaceTree();
  }

  getFile(key: string) {
    return this.#files.get(key);
  }

  /**
   * Adds a namespace to the final tree.
   * @param namespace - The namespace node to add.
   * @param tree - The root of the namespace tree.
   */
  #addNamespaceToTree(namespace: NamespaceNode, tree: NamespaceNode) {
    // Deconstruct the namespace's name, so that A.B
    // becomes B, child of A.
    const parts = namespace.name.split(".");
    let current = tree;

    // For each part of the namespace, we check if it's
    // already in the tree. If it is, we go to the next
    // part. If it isn't, we add it to the tree.
    if (namespace.name !== "") {
      parts.forEach((part) => {
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

  /**
   * Assigns namespaces to classes, used for ambiguity resolution.
   * @param tree - The root of the namespace tree.
   * @param parentNamespace - The parent namespace name.
   */
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

  /**
   * Builds a tree of namespaces from the parsed files.
   * @returns The root of the namespace tree.
   */
  buildNamespaceTree(): NamespaceNode {
    const namespaceTree: NamespaceNode = {
      name: "",
      exports: [],
      childrenNamespaces: [],
    };

    // Parse all files.
    this.#files.forEach((file) => {
      const namespaces = this.#nsResolver
        .getNamespacesFromFile(file)
        .map((ns) => ns as NamespaceNode);

      namespaces.forEach((namespace) => {
        this.#addNamespaceToTree(namespace, namespaceTree);
      });
    });

    // Assign namespaces to classes.
    this.#assignNamespacesToClasses(namespaceTree);

    // I don't understand why, but the root element is always empty
    return namespaceTree;
  }

  /**
   * Finds a namespace in the namespace tree.
   * @param tree - The root of the namespace tree.
   * @param namespaceName - The name of the namespace to find.
   * @returns The namespace node if found, otherwise null.
   */
  findNamespaceInTree(
    tree: NamespaceNode,
    namespaceName: string,
  ): NamespaceNode | null {
    if (namespaceName.includes(".")) {
      const parts = namespaceName.split(".");
      const simpleNamespaceName = parts[0];
      const rest = parts.slice(1).join(".");

      const namespace = tree.childrenNamespaces.find(
        (ns) => ns.name === simpleNamespaceName,
      );
      if (namespace) {
        return this.findNamespaceInTree(namespace, rest);
      }
    }

    return (
      tree.childrenNamespaces.find((ns) => ns.name === namespaceName) ?? null
    );
  }

  /**
   * Finds a class in the namespace tree.
   * @param tree - The root of the namespace tree.
   * @param className - The name of the class to find.
   * @returns The symbol node if found, otherwise null.
   */
  findClassInTree(tree: NamespaceNode, className: string): SymbolNode | null {
    // Management of qualified names
    if (className.includes(".")) {
      const parts = className.split(".");
      const namespaceName = parts.slice(0, -1).join(".");
      const simpleClassName = parts[parts.length - 1];

      const namespace = this.findNamespaceInTree(tree, namespaceName);
      if (namespace) {
        return (
          namespace.exports.find((cls) => cls.name === simpleClassName) ?? null
        );
      } else {
        // In case the qualifier is actually not a namespace but a class
        // Check OuterInnerClass in the tests.
        return this.findClassInTree(this.nsTree, namespaceName);
      }
    }
    // Find the class in the current node's classes.
    if (tree.exports.some((cls) => cls.name === className)) {
      return tree.exports.find((cls) => cls.name === className) ?? null;
    }

    // Recursively search in children namespaces.
    for (const namespace of tree.childrenNamespaces) {
      const found = this.findClassInTree(namespace, className);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Gets all the exports for a file from the namespace tree.
   * @param filepath - The path of the file to get exports for.
   * @returns An array of exported symbols.
   */
  getExportsForFile(filepath: string): SymbolNode[] {
    const exports: SymbolNode[] = [];

    const searchClassesInNamespace = (namespace: NamespaceNode) => {
      namespace.exports.forEach((symbol) => {
        if (symbol.filepath === filepath) {
          exports.push(symbol);
        }
      });

      namespace.childrenNamespaces.forEach((childNamespace) => {
        searchClassesInNamespace(childNamespace);
      });
    };

    searchClassesInNamespace(this.nsTree);
    return exports;
  }
}
