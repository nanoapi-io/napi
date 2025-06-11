import type { Symbol } from "../symbolRegistry/types.ts";
import type Parser from "tree-sitter";

export interface ExportedFile {
  symbols: Map<string, Symbol>;
  originalFile: {
    path: string;
    rootNode: Parser.SyntaxNode;
  };
  strippedFile: {
    path: string;
    rootNode: Parser.SyntaxNode;
  };
}
