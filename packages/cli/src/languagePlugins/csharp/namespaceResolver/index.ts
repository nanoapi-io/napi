import Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

// Constants representing different types of symbols in C#
export const CSHARP_CLASS_TYPE = "class";
export const CSHARP_STRUCT_TYPE = "struct";
export const CSHARP_ENUM_TYPE = "enum";
export const CSHARP_INTERFACE_TYPE = "interface";
export const CSHARP_DELEGATE_TYPE = "delegate";

/**  Type alias for the different symbol types */
export type SymbolType =
  | typeof CSHARP_CLASS_TYPE
  | typeof CSHARP_STRUCT_TYPE
  | typeof CSHARP_ENUM_TYPE
  | typeof CSHARP_INTERFACE_TYPE
  | typeof CSHARP_DELEGATE_TYPE;

/**
 * Interface representing a file
 */
export interface File {
  /** The path of the file */
  path: string;
  /** The root node of the file */
  rootNode: Parser.SyntaxNode;
}

/**
 * Interface representing an exported symbol
 */
export interface ExportedSymbol {
  /** The name of the symbol */
  name: string;
  /** The type of the symbol (i.e. class, struct, enum, etc.) */
  type: SymbolType;
  /** The syntax node corresponding to the symbol */
  node: Parser.SyntaxNode;
  /** The syntax node corresponding to the identifier */
  identifierNode: Parser.SyntaxNode;
  /** The namespace of the symbol */
  namespace?: string;
  /** The file path where the symbol is defined */
  filepath: string;
  /** The parent symbol if this is a nested class */
  parent?: ExportedSymbol;
}

/**
 * Interface representing a namespace
 */
export interface Namespace {
  /** The name of the namespace */
  name: string;
  /** The syntax node corresponding to the namespace */
  node: Parser.SyntaxNode;
  /** Optional because the root namespace doesn't have an identifier */
  identifierNode?: Parser.SyntaxNode;
  /** List of classes and types exported by the namespace */
  exports: ExportedSymbol[];
  /** List of child namespaces */
  childrenNamespaces: Namespace[];
}

export class CSharpNamespaceResolver {
  parser: Parser = csharpParser;
  #currentFile: string;
  #cache: Map<string, Namespace[]> = new Map<string, Namespace[]>();

  constructor() {
    this.#currentFile = "";
  }

  /**
   * Parses namespaces from a file along with the exported classes
   * @param file The file to parse
   * @returns An array of namespaces found in the file
   */
  getNamespacesFromFile(file: File): Namespace[] {
    // Check if the file is already in the cache
    const cacheValue = this.#cache.get(file.path);
    if (cacheValue) {
      return cacheValue;
    }
    // Set the current file, so that we can keep track of it in the recursive functions
    this.#currentFile = file.path;
    // Different behavior if the file has a file-scoped namespace
    const fileScopedNamespace = this.#getFileScopedNamespaceDeclaration(
      file.rootNode,
    );
    let namespaces: Namespace[];
    if (fileScopedNamespace) {
      // Get the namespaces from the file-scoped namespace
      namespaces = [
        {
          name: fileScopedNamespace,
          node: file.rootNode,
          exports: this.#getExportsFromNode(file.rootNode),
          childrenNamespaces: [],
        },
      ];
      // Cache the namespaces
      this.#cache.set(file.path, namespaces);
      return namespaces;
    } else {
      // Get the namespaces from the root node
      namespaces = [
        {
          name: "",
          node: file.rootNode,
          exports: this.#getExportsFromNode(file.rootNode),
          childrenNamespaces: this.#getNamespacesFromNode(file.rootNode),
        },
      ];
    }
    // Cache the namespaces
    this.#cache.set(file.path, namespaces);
    return namespaces;
  }

  /**
   * Gets the file-scoped namespace declaration from a node
   * @param node The syntax node to search for a file-scoped namespace declaration
   * @returns The name of the file-scoped namespace, if any
   */
  #getFileScopedNamespaceDeclaration(
    node: Parser.SyntaxNode,
  ): string | undefined {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
      (file_scoped_namespace_declaration
        name: (qualified_name) @id
      )
      `,
    )
      .captures(node)
      .map((capture) => capture.node.text)[0];
  }

  /**
   * Recursively parses namespaces from a node
   * @param node The syntax node to parse for namespaces
   * @returns An array of namespaces found in the node
   */
  #getNamespacesFromNode(node: Parser.SyntaxNode): Namespace[] {
    return node.children
      .filter((child) => child.type === "namespace_declaration")
      .map((child) => ({
        name: this.#getIdentifierNode(child).text,
        node: child,
        identifierNode: this.#getIdentifierNode(child),
        exports: this.#getExportsFromNode(this.#getDeclarationList(child)),
        childrenNamespaces: this.#getNamespacesFromNode(
          this.#getDeclarationList(child),
        ),
      }));
  }

  /**
   * Gets the declaration list from a node
   * i.e. where the classes, namespaces and methods are declared
   * @param node The syntax node to search for a declaration list
   * @returns The declaration list node
   */
  #getDeclarationList(node: Parser.SyntaxNode): Parser.SyntaxNode {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (declaration_list) @body
      `,
    ).captures(node)[0].node;
  }

  /**
   * Gets the name from a node
   * @param node The syntax node to search for an identifier
   * @returns The identifier node
   */
  #getIdentifierNode(node: Parser.SyntaxNode): Parser.SyntaxNode {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (identifier) @name
        (qualified_name) @name
      `,
    ).captures(node)[0].node;
  }

  /**
   * Gets the classes, structs and enums from a node
   * @param node The syntax node to search for exported symbols
   * @param parent The parent symbol if this is a nested class
   * @returns An array of exported symbols found in the node
   */
  #getExportsFromNode(
    node: Parser.SyntaxNode,
    parent?: ExportedSymbol,
  ): ExportedSymbol[] {
    const exports: ExportedSymbol[] = [];
    node.children.forEach((child) => {
      if (
        child.type === "class_declaration" ||
        child.type === "struct_declaration" ||
        child.type === "enum_declaration" ||
        child.type === "interface_declaration" ||
        child.type === "delegate_declaration"
      ) {
        const symbol: ExportedSymbol = {
          name: this.#getIdentifierNode(child).text,
          type: child.type.replace("_declaration", "") as SymbolType,
          node: child,
          identifierNode: this.#getIdentifierNode(child),
          filepath: this.#currentFile,
          parent,
        };
        exports.push(symbol);
        // Recursively get nested classes
        if (
          child.children.some(
            (grandChild) => grandChild.type === "declaration_list",
          )
        ) {
          exports.push(
            ...this.#getExportsFromNode(
              this.#getDeclarationList(child),
              symbol,
            ),
          );
        }
      }
    });
    return exports;
  }

  /**
   * Recursively gets all the exported classes from a list of namespaces
   * @param namespaces The list of namespaces to search for exported symbols
   * @returns An array of all exported symbols found in the namespaces
   */
  getExportsFromNamespaces(namespaces: Namespace[]): ExportedSymbol[] {
    let classes: ExportedSymbol[] = [];
    namespaces.forEach((ns) => {
      classes = classes.concat(ns.exports);
      classes = classes.concat(
        this.getExportsFromNamespaces(ns.childrenNamespaces),
      );
    });
    return classes;
  }
}
