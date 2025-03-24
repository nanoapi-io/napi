import Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export const CSHARP_CLASS_TYPE = "class";
export const CSHARP_STRUCT_TYPE = "struct";
export const CSHARP_ENUM_TYPE = "enum";
export const CSHARP_INTERFACE_TYPE = "interface";
export const CSHARP_DELEGATE_TYPE = "delegate";

export type SymbolType =
  | typeof CSHARP_CLASS_TYPE
  | typeof CSHARP_STRUCT_TYPE
  | typeof CSHARP_ENUM_TYPE
  | typeof CSHARP_INTERFACE_TYPE
  | typeof CSHARP_DELEGATE_TYPE;

export interface File {
  path: string;
  rootNode: Parser.SyntaxNode;
}

export interface ExportedSymbol {
  name: string;
  type: SymbolType;
  node: Parser.SyntaxNode;
  namespace?: string;
  filepath: string;
}

export interface Namespace {
  name: string;
  exports: ExportedSymbol[];
  childrenNamespaces: Namespace[];
}

export class NamespaceResolver {
  parser: Parser = csharpParser;
  #currentFile: string;
  #cache: Map<string, Namespace[]> = new Map<string, Namespace[]>();

  constructor() {
    this.#currentFile = "";
  }

  // Parses namespaces from a file along with the exported classes
  getNamespacesFromFile(file: File): Namespace[] {
    // Check if the file is already in the cache
    const cacheValue = this.#cache.get(file.path);
    if (cacheValue) {
      return cacheValue;
    }
    // Set the current file, so that we can keep track of it in the recursive functions
    this.#currentFile = file.path;
    // Get the namespaces from the root node
    const namespaces = [
      {
        name: "",
        exports: this.#getExportsFromNode(file.rootNode),
        childrenNamespaces: this.#getNamespacesFromNode(file.rootNode),
      },
    ];
    // Cache the namespaces
    this.#cache.set(file.path, namespaces);
    return namespaces;
  }

  // Recursively parses namespaces from a node
  #getNamespacesFromNode(node: Parser.SyntaxNode): Namespace[] {
    return node.children
      .filter((child) => child.type === "namespace_declaration")
      .map((child) => ({
        name: this.#getName(child),
        exports: this.#getExportsFromNode(this.#getDeclarationList(child)),
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
  #getExportsFromNode(node: Parser.SyntaxNode): ExportedSymbol[] {
    return node.children
      .filter(
        (child) =>
          child.type === "class_declaration" ||
          child.type === "struct_declaration" ||
          child.type === "enum_declaration" ||
          child.type === "interface_declaration" ||
          child.type === "delegate_declaration",
      )
      .map((child) => ({
        name: this.#getName(child),
        type: child.type.replace("_declaration", "") as SymbolType,
        node: child,
        filepath: this.#currentFile,
      }));
  }

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
