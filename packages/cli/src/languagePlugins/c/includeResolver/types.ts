import type Parser from "npm:tree-sitter";
import type { Symbol } from "../symbolRegistry/types.ts";

/** Interface representing the #include statements of a file */
export interface Inclusions {
  /** The path of the file */
  filepath: string;
  /** The imported symbols from internal imports */
  symbols: Map<string, Symbol>;
  /** The tree of recursive inclusions of the internal imports */
  internal: InclusionNode;
  /** The list of include directives of the standard imports */
  standard: Map<string, Parser.SyntaxNode>;
}

/** Interface representing a node in the internal inclusion tree */
export interface InclusionNode {
  /** The path to the inclusion relative to its parent, or "." if root */
  name: string;
  /** The inclusions it contains, relative to itself */
  children: Map<string, InclusionNode>;
}
