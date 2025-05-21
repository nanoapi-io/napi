import type Parser from "tree-sitter";

export interface ManifestDiagnostics {
  filename: string;
  line: number;
  column: number;
  message: string;
}

export class TreeSitterError implements ManifestDiagnostics {
  filename: string;
  line: number;
  column: number;
  message: string;

  constructor(
    filename: string,
    capture: Parser.QueryCapture,
  ) {
    this.filename = filename;
    this.line = capture.node.startPosition.row + 1;
    this.column = capture.node.startPosition.column + 1;
    this.message =
      `[WARN] (${filename}:${this.line}:${this.column}) | Tree-sitter error`;
  }
}

export class UnnamedDatatypeWarning implements ManifestDiagnostics {
  filename: string;
  line: number;
  column: number;
  datatype: string;
  message: string;

  constructor(
    filename: string,
    capture: Parser.QueryCapture,
  ) {
    this.filename = filename;
    this.line = capture.node.startPosition.row + 1;
    this.column = capture.node.startPosition.column + 1;
    this.datatype = capture.name;
    this.message =
      `[WARN] (${filename}:${this.line}:${this.column}) | Unnamed ${this.datatype}`;
  }
}
