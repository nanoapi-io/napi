import { SymbolType } from "../headerResolver/types.js";
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

/**
 * Represents a symbol in a C file
 */
export interface CDepSymbol {
  id: string;
  type: SymbolType;
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
