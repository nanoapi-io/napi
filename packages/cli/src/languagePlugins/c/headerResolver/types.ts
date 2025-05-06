import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.js";

// Constants representing different types of symbols in C
export const C_STRUCT_TYPE = "struct";
export const C_UNION_TYPE = "union";
export const C_ENUM_TYPE = "enum";
export const C_FUNCTION_TYPE = "function";
export const C_VARIABLE_TYPE = "variable";

// Constants representing different storage class specifiers in C
export const C_AUTO_SPECIFIER = "auto";
export const C_REGISTER_SPECIFIER = "register";
export const C_STATIC_SPECIFIER = "static";
export const C_EXTERN_SPECIFIER = "extern";

// Constants representing different type qualifiers in C
export const C_CONST_QUALIFIER = "const";
export const C_VOLATILE_QUALIFIER = "volatile";
export const C_RESTRICT_QUALIFIER = "restrict";
export const C_ATOMIC_QUALIFIER = "_Atomic";

/**  Type alias for the different symbol types */
export type SymbolType =
  | typeof C_STRUCT_TYPE
  | typeof C_UNION_TYPE
  | typeof C_ENUM_TYPE
  | typeof C_FUNCTION_TYPE
  | typeof C_VARIABLE_TYPE;

/** Type alias for the different storage class specifiers */
export type StorageClassSpecifier =
  | typeof C_AUTO_SPECIFIER
  | typeof C_REGISTER_SPECIFIER
  | typeof C_STATIC_SPECIFIER
  | typeof C_EXTERN_SPECIFIER;

/** Type alias for the different type qualifiers */
export type TypeQualifier =
  | typeof C_CONST_QUALIFIER
  | typeof C_VOLATILE_QUALIFIER
  | typeof C_RESTRICT_QUALIFIER;

export interface File {
  path: string;
  rootNode: Parser.SyntaxNode;
}

export interface ExportedSymbol {
  name: string;
  type: SymbolType;
  specifiers: StorageClassSpecifier[];
  qualifiers: TypeQualifier[];
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  filepath: string;
}
