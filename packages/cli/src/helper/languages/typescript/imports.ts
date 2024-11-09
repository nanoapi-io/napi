import Parser from "tree-sitter";
import {
  getJavascriptImportIdentifierUsage,
  getJavascriptImports,
} from "../javascript/imports";

export function getTypescriptImports(parser: Parser, node: Parser.SyntaxNode) {
  return getJavascriptImports(parser, node);
}

export function getTypescriptImportIdentifierUsage(
  parser: Parser,
  node: Parser.SyntaxNode,
  identifier: Parser.SyntaxNode,
) {
  return getJavascriptImportIdentifierUsage(parser, node, identifier, true);
}
