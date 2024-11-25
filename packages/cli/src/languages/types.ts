import { Group } from "../dependencyManager/types";
import Parser from "tree-sitter";

export interface Import {
  node: Parser.SyntaxNode;
  source: string;
  importSpecifierIdentifiers: Parser.SyntaxNode[];
  importIdentifier?: Parser.SyntaxNode;
  namespaceImport?: Parser.SyntaxNode;
}

export interface Export {
  namedExports: {
    exportNode: Parser.SyntaxNode;
    identifierNode: Parser.SyntaxNode;
  }[];
  defaultExport?: Parser.SyntaxNode;
}

export interface LanguagePlugin {
  parser: Parser;

  commentPrefix: string;
  annotationRegex: RegExp;

  getCommentNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[];

  removeAnnotationFromOtherGroups(
    sourceCode: string,
    groupToKeep: Group,
  ): string;

  getImports(node: Parser.SyntaxNode): Import[];

  getExports(node: Parser.SyntaxNode): Export;

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    exportMap: Map<string, Export>,
  ): string;

  cleanupUnusedImports(sourceCode: string): string;
}
