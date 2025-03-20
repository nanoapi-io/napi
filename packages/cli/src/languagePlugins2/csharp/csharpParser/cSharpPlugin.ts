import Parser from "tree-sitter";
import { File, Namespace, NamespaceClass } from "./types";
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

  getNamespacesFromFile(file: File): Namespace[] {
    this.#currentFile = file.path;
    return this.#getNamespacesFromRootNode(file.rootNode);
  }

  getNamespacesFromContent(file: string): Namespace[] {
    const tree = this.parser.parse(file);
    this.#currentFile = "";
    return this.#getNamespacesFromRootNode(tree.rootNode);
  }

  #getNamespacesFromRootNode(node: Parser.SyntaxNode): Namespace[] {
    return [
      {
        name: "",
        classes: this.#getClassesFromNode(node),
        childrenNamespaces: this.#getNamespacesFromNode(node),
      },
    ];
  }

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

  #getDeclarationList(node: Parser.SyntaxNode): Parser.SyntaxNode {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (declaration_list) @body
      `,
    ).captures(node)[0].node;
  }

  #getName(node: Parser.SyntaxNode): string {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (identifier) @name
        (qualified_name) @name
      `,
    ).captures(node)[0].node.text;
  }

  #getClassesFromNode(node: Parser.SyntaxNode): NamespaceClass[] {
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
          filepath: this.#currentFile,
        }))
    );
  }

  addNamespaceToTree(namespace: Namespace, tree: Namespace) {
    const parts = namespace.name.split(".");
    let current = tree;

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

    current.classes.push(...namespace.classes);
    current.childrenNamespaces.push(...namespace.childrenNamespaces);
  }

  buildNamespaceTree(): Namespace {
    const namespaceTree: Namespace = {
      name: "",
      classes: [],
      childrenNamespaces: [],
    };

    this.#files.forEach((file) => {
      this.#namespaces = this.#namespaces.concat(
        this.getNamespacesFromFile(file),
      );
    });

    this.#namespaces.forEach((namespace) => {
      this.addNamespaceToTree(namespace, namespaceTree);
    });

    return namespaceTree;
  }

  #findClassInTree(tree: Namespace, className: string): NamespaceClass | null {
    if (tree.classes.some((cls) => cls.name === className)) {
      return tree.classes.find((cls) => cls.name === className) ?? null;
    }

    for (const namespace of tree.childrenNamespaces) {
      const found = this.#findClassInTree(namespace, className);
      if (found) {
        return found;
      }
    }

    return null;
  }

  #getCalledClasses(
    node: Parser.SyntaxNode,
    namespaceTree: Namespace,
  ): NamespaceClass[] {
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
        ((using_directive
          (qualified_name
              name: (identifier) @classname
        )))
      `,
    )
      .captures(node)
      .map((capture) => {
        const className = capture.node.text;
        return (
          this.#findClassInTree(namespaceTree, className) ?? {
            name: className,
            filepath: "",
          }
        );
      });
  }

  getUsedFilesFromFile(namespaceTree: Namespace, file: File): NamespaceClass[] {
    return this.#getCalledClasses(file.rootNode, namespaceTree).filter(
      (cls) => cls.filepath !== "",
    );
  }

  getUsedFilesFromContent(
    namespaceTree: Namespace,
    file: string,
  ): NamespaceClass[] {
    const tree = this.parser.parse(file);
    return this.#getCalledClasses(tree.rootNode, namespaceTree).filter(
      (cls) => cls.filepath !== "",
    );
  }
}
