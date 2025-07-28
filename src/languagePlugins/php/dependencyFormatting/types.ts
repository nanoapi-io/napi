import type Parser from "tree-sitter";
import type { SymbolType } from "../exportResolver/types.ts";

/**
 * Represents a dependency in a PHP file
 */
export interface PHPDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

/**
 * Represents a dependent in a PHP file
 */
export interface PHPDependent {
  id: string;
  symbols: Record<string, string>;
}

/**
 * Represents a symbol in a PHP file
 */
export interface PHPDepSymbol {
  id: string;
  type: SymbolType;
  lineCount: number;
  characterCount: number;
  node: Parser.SyntaxNode;
  dependents: Record<string, PHPDependent>;
  dependencies: Record<string, PHPDependency>;
}

/**
 * Represents a PHP file with its dependencies and symbols.
 */
export interface PHPDepFile {
  id: string;
  filePath: string;
  rootNode: Parser.SyntaxNode;
  lineCount: number;
  characterCount: number;
  dependencies: Record<string, PHPDependency>;
  symbols: Record<string, PHPDepSymbol>;
}
