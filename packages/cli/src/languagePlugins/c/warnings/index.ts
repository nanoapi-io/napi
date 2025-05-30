import {
  type ManifestDiagnostics,
  TreeSitterError,
  UnnamedDatatypeWarning,
} from "./types.ts";
import type Parser from "npm:tree-sitter";
import { C_ERROR_QUERY, C_UNNAMED_DATATYPE_QUERY } from "./queries.ts";

export class CWarningManager {
  diagnostics: ManifestDiagnostics[] = [];
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    for (const [, { path, rootNode }] of files) {
      this.diagnostics.push(
        ...this.getDiagnostics(path, rootNode),
      );
    }
  }

  private getDiagnostics(
    path: string,
    rootNode: Parser.SyntaxNode,
  ): ManifestDiagnostics[] {
    const diagnostics: ManifestDiagnostics[] = [];
    const errorQuery = C_ERROR_QUERY.captures(rootNode);
    const unnamedDatatypeQuery = C_UNNAMED_DATATYPE_QUERY.captures(rootNode);

    for (const capture of errorQuery) {
      diagnostics.push(new TreeSitterError(path, capture));
    }

    for (const capture of unnamedDatatypeQuery) {
      diagnostics.push(new UnnamedDatatypeWarning(path, capture));
    }

    return diagnostics;
  }

  /**
   * Print the diagnostics to the console.
   * @param count The number of diagnostics to print. If undefined, all diagnostics will be printed.
   * @example
   * ```ts
   * const manager = new CWarningManager(files);
   * // Prints up to 5 diagnostics
   * manager.printDiagnostics(5);
   * // Prints all diagnostics
   * manager.printDiagnostics();
   * ```
   */
  public printDiagnostics(count: number | undefined = undefined): void {
    if (!count) {
      count = this.diagnostics.length;
    }
    if (count > this.diagnostics.length) {
      count = this.diagnostics.length;
    }
    for (let i = 0; i < count; i++) {
      const diagnostic = this.diagnostics[i];
      console.warn(diagnostic.message);
    }
  }
}
