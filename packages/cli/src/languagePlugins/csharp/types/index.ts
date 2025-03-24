import Parser from "tree-sitter";

export interface File {
  path: string;
  rootNode: Parser.SyntaxNode;
}

export interface ExportedSymbol {
  name: string;
  type: string;
  node: Parser.SyntaxNode;
  namespace?: string;
  filepath: string;
}

export interface Namespace {
  name: string;
  classes: ExportedSymbol[];
  childrenNamespaces: Namespace[];
}
