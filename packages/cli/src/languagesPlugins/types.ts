import Parser from "tree-sitter";
import { Group } from "../dependencyManager/types";

export interface DepImportIdentifier {
  // Specific to each programing languages. Used by the language plugins.
  type: string;
  // This is what will be deleted if needed.
  node: Parser.SyntaxNode;
  // Node of the identifier
  identifierNode: Parser.SyntaxNode;
  // Alias node. Optional, used to see if the identifier is used in the code.
  aliasNode?: Parser.SyntaxNode;
  // Is the identifier used? this field will first be undefined.
  // During code analysis, we will set it to true or false depending if the identifier is used.
  used?: boolean;
}

export interface DepImport {
  // Is it an external dependency? if so we mark it as we ignore these sometimes.
  isExternal: boolean;
  // Where is the import coming from? Full path.
  source: string;
  // The node of the import. This is what will be deleted if needed.
  node: Parser.SyntaxNode;
  // Identifiers of each imports.
  identifiers: DepImportIdentifier[];
  // language
  language: string;
}

export interface DepExportIdentifier {
  // Node of the identifier
  node: Parser.SyntaxNode;
  // Node of the identifier
  identifierNode: Parser.SyntaxNode;
  // Alias node. Optional, used to see if the identifier is used in the code.
  aliasNode?: Parser.SyntaxNode;
  // During code analysis, we will set it to true or false depending if the identifier is used.
  used?: boolean;
}

export interface DepExport {
  // Specific to each programing languages. Used by the language plugins.
  type: string;
  // Node of the export. This is what will be deleted if needed.
  node: Parser.SyntaxNode;
  // Identifiers of each exports.
  identifiers: DepExportIdentifier[];
  // language
  language: string;
}

export interface LanguagePlugin {
  parser: Parser;
  entryPointPath: string;

  commentPrefix: string;
  annotationRegex: RegExp;

  getAnnotationNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[];

  removeAnnotationFromOtherGroups(
    sourceCode: string,
    groupToKeep: Group,
  ): string;

  getImports(filePath: string, node: Parser.SyntaxNode): DepImport[];

  getExports(node: Parser.SyntaxNode): DepExport[];

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    exportMap: Map<string, DepExport[]>,
  ): string;

  cleanupUnusedImports(filePath: string, sourceCode: string): string;
}
