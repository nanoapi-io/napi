import type Parser from "tree-sitter";
import type { CFile, Symbol } from "../symbolRegistry/types.ts";

/** Interface representing the #include statements of a file */
export interface Inclusions {
  /** The path of the file */
  filepath: string;
  /** The imported symbols from internal imports */
  symbols: Map<string, IncludedSymbol>;
  /** The tree of recursive inclusions of the internal imports */
  internal: InclusionNode;
  /** The list of include directives of the standard imports */
  standard: Map<string, Parser.SyntaxNode>;
}

/** Interface representing a symbol imported through an include directive */
export interface IncludedSymbol {
  /** The corresponding symbol */
  symbol: Symbol;
  /** The file that allows the usage of this symbol */
  includefile: CFile;
  // Due to recursive inclusions, the file may not be the one that exports
  // said symbol. Check "all.h" in the test files.
}

/** Interface representing a node in the internal inclusion tree */
export interface InclusionNode {
  /** The path to the inclusion relative to its parent, or "." if root */
  name: string;
  /** The complete file path */
  filepath: string;
  /** The inclusions it contains, relative to itself */
  children: Map<string, InclusionNode>;
  /** The parent of the node */
  parent?: InclusionNode;
}
