import type Parser from "tree-sitter";

// Constants representing different types of symbols in C
export const C_STRUCT_TYPE = "struct";
export const C_UNION_TYPE = "union";
export const C_ENUM_TYPE = "enum";
export const C_FUNCTION_DEFINITION_TYPE = "function_definition";
export const C_FUNCTION_SIGNATURE_TYPE = "function_signature";
export const C_MACRO_FUNCTION_TYPE = "macro_function";
export const C_MACRO_CONSTANT_TYPE = "macro_constant";
export const C_VARIABLE_TYPE = "variable";
export const C_TYPEDEF_TYPE = "typedef";

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
  | typeof C_FUNCTION_DEFINITION_TYPE
  | typeof C_FUNCTION_SIGNATURE_TYPE
  | typeof C_MACRO_FUNCTION_TYPE
  | typeof C_MACRO_CONSTANT_TYPE
  | typeof C_VARIABLE_TYPE
  | typeof C_TYPEDEF_TYPE;

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

/** Interface representing an exported symbol */
export interface ExportedSymbol {
  /** The name of the symbol */
  name: string;
  /** The type of the symbol (i.e. struct, union, enum, etc.) */
  type: SymbolType;
  /** The storage class specifiers of the symbol (i.e. static, extern) */
  specifiers: StorageClassSpecifier[];
  /** The type qualifiers of the symbol (i.e. const, volatile) */
  qualifiers: TypeQualifier[];
  /** The syntax node corresponding to the symbol */
  node: Parser.SyntaxNode;
  /** The syntax node corresponding to the identifier */
  identifierNode: Parser.SyntaxNode;
  /** The path of the symbol's file */
  filepath: string;
}
