import Parser from "tree-sitter";
import { getJavascriptExports } from "../javascript/exports";

export function getTypescriptExports(parser: Parser, node: Parser.SyntaxNode) {
  return getJavascriptExports(parser, node, true);
}
