import {
  C_VARIABLE_TYPE,
  type ExportedSymbol,
} from "../headerResolver/types.ts";
import type Parser from "npm:tree-sitter";

/** Interface representing a C symbol */
export class Symbol {
  /** The name of the symbol */
  name: string;
  /** The corresponding ExportedSymbol object */
  declaration: ExportedSymbol;
  constructor(name: string, declaration: ExportedSymbol) {
    this.name = name;
    this.declaration = declaration;
  }
}

/** Interface representing a C function signature */
export class FunctionSignature extends Symbol {
  /** The definition of the function in a source file */
  definition?: FunctionDefinition;
  /** Whether the function is a macro or not */
  isMacro: boolean;
  constructor(
    name: string,
    declaration: ExportedSymbol,
    isMacro: boolean,
  ) {
    super(name, declaration);
    this.isMacro = isMacro;
    this.definition = undefined;
  }
}

/** Interface representing a C function definition */
export class FunctionDefinition extends Symbol {
  /** The declaration of the function in a header file */
  signature?: FunctionSignature;
  /** Whether the function is a macro or not */
  isMacro: boolean;
  constructor(name: string, declaration: ExportedSymbol, isMacro: boolean) {
    super(name, declaration);
    this.isMacro = isMacro;
    this.signature = undefined;
  }
}

/** Interface representing a C variable */
export class DataType extends Symbol {
  typedefs: Map<string, Typedef>;
  constructor(name: string, declaration: ExportedSymbol) {
    super(name, declaration);
    this.typedefs = new Map();
  }
}

/** Interface representing a C typedef */
export class Typedef extends Symbol {
  datatype?: DataType;
}

export class Variable extends Symbol {
  /** Whether the variable is a macro or not */
  isMacro: boolean;
  constructor(name: string, declaration: ExportedSymbol, isMacro: boolean) {
    super(name, declaration);
    this.isMacro = isMacro;
  }
}

export class EnumMember extends Symbol {
  parent: Enum;
  constructor(name: string, declaration: ExportedSymbol, parent: Enum) {
    super(name, declaration);
    this.parent = parent;
  }
}

export class Enum extends DataType {
  members: Map<string, EnumMember>;
  constructor(name: string, declaration: ExportedSymbol) {
    super(name, declaration);
    const enumerators = declaration.node.childForFieldName("body");
    this.members = new Map();
    if (enumerators) {
      for (
        const enumerator of enumerators.children.filter((c) =>
          c.type === "enumerator"
        )
      ) {
        const idNode = enumerator.childForFieldName("name");
        if (!idNode) {
          continue;
        }
        const member = new EnumMember(
          idNode.text,
          {
            name: idNode.text,
            type: C_VARIABLE_TYPE,
            filepath: declaration.filepath,
            specifiers: [],
            qualifiers: ["const"],
            node: enumerator,
            identifierNode: idNode,
          },
          this,
        );
        this.members.set(enumerator.text, member);
      }
    }
  }
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
  constructor(
    file: { path: string; rootNode: Parser.SyntaxNode },
    filetype: CFileType,
  ) {
    this.file = file;
    this.type = filetype;
    this.symbols = new Map();
  }
}
