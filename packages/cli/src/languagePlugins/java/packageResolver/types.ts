import type Parser from "tree-sitter";

export const JAVA_PUBLIC_MODIFIER = "public";
export const JAVA_PRIVATE_MODIFIER = "private";
export const JAVA_PROTECTED_MODIFIER = "protected";
export const JAVA_ABSTRACT_MODIFIER = "abstract";
export const JAVA_FINAL_MODIFIER = "final";
export const JAVA_STATIC_MODIFIER = "static";
export const JAVA_STRICTFP_MODIFIER = "strictfp";
export const JAVA_SEALED_MODIFIER = "sealed";
export const JAVA_NONSEALED_MODIFIER = "non-sealed";

export type Modifier =
  | typeof JAVA_PUBLIC_MODIFIER
  | typeof JAVA_PRIVATE_MODIFIER
  | typeof JAVA_PROTECTED_MODIFIER
  | typeof JAVA_ABSTRACT_MODIFIER
  | typeof JAVA_FINAL_MODIFIER
  | typeof JAVA_STATIC_MODIFIER
  | typeof JAVA_STRICTFP_MODIFIER
  | typeof JAVA_SEALED_MODIFIER
  | typeof JAVA_NONSEALED_MODIFIER;

export const JAVA_CLASS_TYPE = "class";
export const JAVA_INTERFACE_TYPE = "interface";
export const JAVA_ENUM_TYPE = "enum";
export const JAVA_RECORD_TYPE = "record";
export const JAVA_ANNOTATION_TYPE = "annotation";

export type SymbolType =
  | typeof JAVA_CLASS_TYPE
  | typeof JAVA_INTERFACE_TYPE
  | typeof JAVA_ENUM_TYPE
  | typeof JAVA_RECORD_TYPE
  | typeof JAVA_ANNOTATION_TYPE;

export interface JavaFile {
  path: string;
  rootNode: Parser.SyntaxNode;
  symbol: ExportedSymbol;
  package: string;
  imports: string[];
}

export interface ExportedSymbol {
  name: string;
  type: SymbolType;
  modifiers: Modifier[];
  typeParamCount: number;
  superclass?: string;
  interfaces: string[];
  children: ExportedSymbol[];
  node: Parser.SyntaxNode;
  idNode: Parser.SyntaxNode;
}
