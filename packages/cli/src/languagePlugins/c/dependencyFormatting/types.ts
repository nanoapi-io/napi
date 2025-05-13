import {
  C_ENUM_TYPE,
  C_UNION_TYPE,
  C_STRUCT_TYPE,
  C_TYPEDEF_TYPE,
  C_VARIABLE_TYPE,
} from "../headerResolver/types.js";
import Parser from "tree-sitter";

/**
 * Represents a dependency in a C file
 */
export interface CDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

/**
 * Represents a dependent in a C file
 */
export interface CDependent {
  id: string;
  symbols: Record<string, string>;
}

export const C_DEP_FUNCTION_TYPE = "function";
export type CDepSymbolType =
  | typeof C_ENUM_TYPE
  | typeof C_UNION_TYPE
  | typeof C_STRUCT_TYPE
  | typeof C_TYPEDEF_TYPE
  | typeof C_VARIABLE_TYPE
  | typeof C_DEP_FUNCTION_TYPE;

/**
 * Represents a symbol in a C file
 */
export interface CDepSymbol {
  id: string;
  type: CDepSymbolType;
  lineCount: number;
  characterCount: number;
  node: Parser.SyntaxNode;
  dependents: Record<string, CDependent>;
  dependencies: Record<string, CDependency>;
}

/**
 * Represents a C file with its dependencies and symbols.
 */
export interface CDepFile {
  id: string;
  filePath: string;
  rootNode: Parser.SyntaxNode;
  lineCount: number;
  characterCount: number;
  dependencies: Record<string, CDependency>;
  symbols: Record<string, CDepSymbol>;
}
