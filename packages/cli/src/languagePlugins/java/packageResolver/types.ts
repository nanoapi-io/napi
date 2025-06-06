import type Parser from "tree-sitter";
import { JAVA_STATIC_MEMBERS_QUERY } from "./queries.ts";

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
export const JAVA_FIELD_TYPE = "field";
export const JAVA_METHOD_TYPE = "method";

export type SymbolType =
  | typeof JAVA_CLASS_TYPE
  | typeof JAVA_INTERFACE_TYPE
  | typeof JAVA_ENUM_TYPE
  | typeof JAVA_RECORD_TYPE
  | typeof JAVA_ANNOTATION_TYPE
  | typeof JAVA_FIELD_TYPE
  | typeof JAVA_METHOD_TYPE;

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
  children: ExportedSymbol[];
  node: Parser.SyntaxNode;
  idNode: Parser.SyntaxNode;
}

export class JavaClass implements ExportedSymbol {
  name: string;
  type: SymbolType;
  modifiers: Modifier[];
  children: ExportedSymbol[];
  node: Parser.SyntaxNode;
  idNode: Parser.SyntaxNode;
  typeParamCount: number;
  superclass?: string;
  interfaces: string[];

  constructor(node: Parser.SyntaxNode, type: SymbolType) {
    const modifiersNode = node.children.find((c) => c.type === "modifiers");
    this.modifiers = [];
    if (modifiersNode) {
      this.modifiers.push(
        ...modifiersNode.children.map((c) => c.text as Modifier),
      );
    }
    this.idNode = node.childForFieldName("name")!;
    this.name = this.idNode.text;
    const typeParams = node.childForFieldName("type_parameters");
    this.typeParamCount = 0;
    if (typeParams) {
      this.typeParamCount = typeParams.namedChildren.length;
    }
    this.superclass = undefined;
    const superclassNode = node.childForFieldName("superclass");
    if (superclassNode) {
      this.superclass = superclassNode.namedChildren[0].text;
    }
    const interfacesNode = node.childForFieldName("interfaces");
    this.interfaces = [];
    if (interfacesNode) {
      this.interfaces.push(
        ...interfacesNode.namedChildren[0].namedChildren.map((c) => c.text),
      );
    }
    this.children = [];
    const bodyNode = node.childForFieldName("body");
    if (bodyNode) {
      this.children.push(
        ...bodyNode.children.filter((c) =>
          [
            "class_declaration",
            "interface_declaration",
            "enum_declaration",
            "record_declaration",
            "annotation_type_declaration",
          ].includes(c.type)
        ).map((c) => new JavaClass(c, c.type.split("_")[0] as SymbolType)),
      );
      this.children.push(
        ...JAVA_STATIC_MEMBERS_QUERY.captures(bodyNode).map((c) =>
          new JavaMember(c)
        ),
      );
    }
    this.type = type;
    this.node = node;
  }
}

export class JavaMember implements ExportedSymbol {
  name: string;
  type: SymbolType;
  modifiers: Modifier[];
  children: ExportedSymbol[];
  node: Parser.SyntaxNode;
  idNode: Parser.SyntaxNode;

  constructor(capture: Parser.QueryCapture) {
    this.type = capture.name as SymbolType;
    this.node = capture.node;
    const modifiersNode = this.node.children.find((c) =>
      c.type === "modifiers"
    )!;
    this.modifiers = modifiersNode.children.map((c) => c.text as Modifier),
      this.children = [];
    if (this.type === "method") {
      this.idNode = this.node.childForFieldName("name")!;
      this.name = this.idNode.text;
    } else {
      const declarator = this.node.childForFieldName("declarator")!;
      this.idNode = declarator.childForFieldName("name")!;
      this.name = this.idNode.text;
    }
  }
}
