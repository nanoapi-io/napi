import Parser from "tree-sitter";

export const PYTHON_CLASS_TYPE = "class";
export const PYTHON_FUNCTION_TYPE = "function";
export const PYTHON_VARIABLE_TYPE = "variable";

export type PythonSymbolType =
  | typeof PYTHON_CLASS_TYPE
  | typeof PYTHON_FUNCTION_TYPE
  | typeof PYTHON_VARIABLE_TYPE;

/**
 * Represents an exported symbol in a Python module.
 * Exported symbols include top-level classes, functions, and variables.
 */
export interface PythonSymbol {
  id: string;
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  type: PythonSymbolType;
}
