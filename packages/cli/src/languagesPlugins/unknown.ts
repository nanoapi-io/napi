import Parser from "tree-sitter";
import { DepExport, DepImport, LanguagePlugin } from "./types";
import { Group } from "../dependencyManager/types";

class UnknownPlugin implements LanguagePlugin {
  parser: Parser;
  baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.parser = new Parser();
  }

  commentPrefix = "";
  annotationRegex = /$^/;

  getAnnotationNodes(): Parser.SyntaxNode[] {
    return [];
  }

  removeAnnotationFromOtherGroups(
    sourceCode: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _groupToKeep: Group,
  ): string {
    return sourceCode;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getImports(_filePath: string, _node: Parser.SyntaxNode): DepImport[] {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getExports(_groupToKeepnode: Parser.SyntaxNode): DepExport[] {
    return [];
  }

  cleanupInvalidImports(
    _filePath: string,
    sourceCode: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _exportMap: Map<string, DepExport[]>,
  ): string {
    return sourceCode;
  }

  cleanupUnusedImports(_filePath: string, sourceCode: string): string {
    return sourceCode;
  }
}

export default UnknownPlugin;
