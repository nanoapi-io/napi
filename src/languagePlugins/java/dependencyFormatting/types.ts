import type { SymbolType } from "../packageResolver/types.ts";
import type Parser from "npm:tree-sitter";

/**
 * Represents a dependency in a Java file
 */
export interface JavaDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

/**
 * Represents a dependent in a Java file
 */
export interface JavaDependent {
  id: string;
  symbols: Record<string, string>;
}

/**
 * Represents a symbol in a Java file
 */
export interface JavaDepSymbol {
  id: string;
  type: SymbolType;
  lineCount: number;
  characterCount: number;
  node: Parser.SyntaxNode;
  dependents: Record<string, JavaDependent>;
  dependencies: Record<string, JavaDependency>;
}

/**
 * Represents a Java file with its dependencies and symbols.
 */
export interface JavaDepFile {
  id: string;
  filePath: string;
  rootNode: Parser.SyntaxNode;
  lineCount: number;
  characterCount: number;
  dependencies: Record<string, JavaDependency>;
  symbols: Record<string, JavaDepSymbol>;
}
