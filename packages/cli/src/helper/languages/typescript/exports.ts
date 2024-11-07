import Parser from "tree-sitter";
import { getJavascriptExports } from "../javascript/exports";

export function getTypescriptExports(parser: Parser, sourceCode: string) {
  return getJavascriptExports(parser, sourceCode, true);
}
