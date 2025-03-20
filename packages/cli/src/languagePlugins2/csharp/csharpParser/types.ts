import Parser from "tree-sitter";

export interface File {
  path: string;
  rootNode: Parser.SyntaxNode;
}

export interface NamespaceClass {
  name: string;
  namespace?: string;
  filepath: string;
}

export interface Namespace {
  name: string;
  classes: NamespaceClass[];
  childrenNamespaces: Namespace[];
}
