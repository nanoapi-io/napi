import Parser from "tree-sitter";
import { getJavascriptAnnotationNodes } from "../javascript/annotations";

export function getTypescriptAnnotationNodes(
  parser: Parser,
  node: Parser.SyntaxNode,
) {
  return getJavascriptAnnotationNodes(parser, node);
}
