import Parser from "tree-sitter";
import { Group } from "../../types";
import {
  cleanupJavascriptAnnotations,
  cleanupJavascriptInvalidImports,
  cleanupUnusedJavascriptImports,
} from "../javascript/cleanup";

export function cleanupTypescriptAnnotations(
  parser: Parser,
  sourceCode: string,
  groupToKeep: Group,
): string {
  return cleanupJavascriptAnnotations(parser, sourceCode, groupToKeep, true);
}

export function cleanupTypescriptInvalidImports(
  parser: Parser,
  filePath: string,
  sourceCode: string,
  exportIdentifiersMap: Map<
    string,
    {
      namedExports: {
        exportNode: Parser.SyntaxNode;
        identifierNode: Parser.SyntaxNode;
      }[];
      defaultExport?: Parser.SyntaxNode;
    }
  >,
) {
  return cleanupJavascriptInvalidImports(
    parser,
    filePath,
    sourceCode,
    exportIdentifiersMap,
    true,
  );
}

export function cleanupUnusedTypescriptImports(
  parser: Parser,
  sourceCode: string,
) {
  return cleanupUnusedJavascriptImports(parser, sourceCode, true);
}
