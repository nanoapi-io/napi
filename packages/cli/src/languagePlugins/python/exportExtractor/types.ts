import Parser from "tree-sitter";

/**
 * Constants for Python symbol types
 */
export const PYTHON_CLASS_TYPE = "class";
export const PYTHON_FUNCTION_TYPE = "function";
export const PYTHON_VARIABLE_TYPE = "variable";

/**
 * Represents the types of symbols that can be exported from a Python module.
 *
 * - class: A Python class definition
 * - function: A Python function definition
 * - variable: A Python variable assignment at module level
 */
export type PythonSymbolType =
  | typeof PYTHON_CLASS_TYPE
  | typeof PYTHON_FUNCTION_TYPE
  | typeof PYTHON_VARIABLE_TYPE;

/**
 * Represents an exported symbol in a Python module.
 * Exported symbols include top-level classes, functions, and variables.
 *
 * This interface captures not only the symbol's identifier (name) but also
 * its AST nodes for detailed analysis.
 */
export interface PythonSymbol {
  /** The identifier (name) of the symbol */
  id: string;
  /** The full AST node for the symbol definition */
  node: Parser.SyntaxNode;
  /** The AST node for just the identifier part of the symbol */
  identifierNode: Parser.SyntaxNode;
  /** The type of the symbol (class, function, or variable) */
  type: PythonSymbolType;
}
