import { ExportedSymbol } from "../headerResolver/types.js";
import Parser from "tree-sitter";

/** Interface representing a C symbol */
export class Symbol {
  /** The name of the symbol */
  name: string;
  /** The corresponding ExportedSymbol object */
  declaration: ExportedSymbol;
}

/** Interface representing a C function */
export class Function extends Symbol {
  /** The definition of the function in a source file */
  definition: Parser.SyntaxNode;
  /** The path to the definition of the function */
  definitionPath: string;
  /** Whether the function is a macro or not */
  isMacro: boolean;
}

/** Interface representing a C variable */
export class DataType extends Symbol {}

/** Interface representing a C typedef */
export class Typedef extends Symbol {
  datatype?: DataType;
}

export class Variable extends Symbol {
  /** Whether the variable is a macro or not */
  isMacro: boolean;
}

export const C_SOURCE_FILE = ".c";
export const C_HEADER_FILE = ".h";
export type CFileType = typeof C_SOURCE_FILE | typeof C_HEADER_FILE;

/** Interface representing a C file */
export class CFile {
  /** The corresponding header file */
  file: {
    path: string;
    rootNode: Parser.SyntaxNode;
  };
  /** The symbols defined in the header file */
  symbols: Map<string, Symbol>;
  /** The type of the file (i.e. .c or .h) */
  type: CFileType;
}
