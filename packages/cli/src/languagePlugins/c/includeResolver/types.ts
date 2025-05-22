import type Parser from "npm:tree-sitter";
import type { Symbol } from "../symbolRegistry/types.ts";

/** Interface representing the #include statements of a file */
export interface Inclusions {
  /** The path of the file */
  filepath: string;
  /** The imported symbols from internal imports */
  symbols: Map<string, Symbol>;
  /** The list of the paths of the internal imports */
  internal: string[];
  /** The list of include directives of the standard imports */
  standard: Map<string, Parser.SyntaxNode>;
}
