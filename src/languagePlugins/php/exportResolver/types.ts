import type Parser from "tree-sitter";

export const PHP_VARIABLE = "variable";
export const PHP_CONSTANT = "constant";
export const PHP_FUNCTION = "function";
export const PHP_CLASS = "class";
export const PHP_INTERFACE = "interface";
export type SymbolType =
  | typeof PHP_VARIABLE
  | typeof PHP_CONSTANT
  | typeof PHP_FUNCTION
  | typeof PHP_CLASS
  | typeof PHP_INTERFACE;

export interface ExportedNamespace {
  name: string;
  symbols: ExportedSymbol[];
}

export interface ExportedSymbol {
  name: string;
  type: SymbolType;
  filepath: string;
  namespace: string;
  node: Parser.SyntaxNode;
  idNode: Parser.SyntaxNode;
}
