import type Parser from "tree-sitter";
import { JAVA_STATIC_MEMBERS_QUERY } from "./queries.ts";

/**
 * Represents the "public" modifier in Java.
 */
export const JAVA_PUBLIC_MODIFIER = "public";

/**
 * Represents the "private" modifier in Java.
 */
export const JAVA_PRIVATE_MODIFIER = "private";

/**
 * Represents the "protected" modifier in Java.
 */
export const JAVA_PROTECTED_MODIFIER = "protected";

/**
 * Represents the "abstract" modifier in Java.
 */
export const JAVA_ABSTRACT_MODIFIER = "abstract";

/**
 * Represents the "final" modifier in Java.
 */
export const JAVA_FINAL_MODIFIER = "final";

/**
 * Represents the "static" modifier in Java.
 */
export const JAVA_STATIC_MODIFIER = "static";

/**
 * Represents the "strictfp" modifier in Java.
 */
export const JAVA_STRICTFP_MODIFIER = "strictfp";

/**
 * Represents the "sealed" modifier in Java.
 */
export const JAVA_SEALED_MODIFIER = "sealed";

/**
 * Represents the "non-sealed" modifier in Java.
 */
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

/**
 * Represents the "class" type in Java.
 */
export const JAVA_CLASS_TYPE = "class";

/**
 * Represents the "interface" type in Java.
 */
export const JAVA_INTERFACE_TYPE = "interface";

/**
 * Represents the "enum" type in Java.
 */
export const JAVA_ENUM_TYPE = "enum";

/**
 * Represents the "record" type in Java.
 */
export const JAVA_RECORD_TYPE = "record";

/**
 * Represents the "annotation" type in Java.
 */
export const JAVA_ANNOTATION_TYPE = "annotation";

/**
 * Represents the "field" type in Java.
 */
export const JAVA_FIELD_TYPE = "field";

/**
 * Represents the "method" type in Java.
 */
export const JAVA_METHOD_TYPE = "method";

export type SymbolType =
  | typeof JAVA_CLASS_TYPE
  | typeof JAVA_INTERFACE_TYPE
  | typeof JAVA_ENUM_TYPE
  | typeof JAVA_RECORD_TYPE
  | typeof JAVA_ANNOTATION_TYPE
  | typeof JAVA_FIELD_TYPE
  | typeof JAVA_METHOD_TYPE;

/**
 * Represents a Java file with its metadata and structure.
 */
export interface JavaFile {
  /** The file path of the Java file. */
  path: string;
  /** The root syntax node of the file. */
  rootNode: Parser.SyntaxNode;
  /** The main exported symbol in the file. */
  symbol: ExportedSymbol;
  /** The package name of the file. */
  package: string;
  /** The list of imports in the file. */
  imports: string[];
}

/**
 * Represents an exported symbol in a Java file.
 */
export interface ExportedSymbol {
  /** The name of the symbol. */
  name: string;
  /** The type of the symbol (e.g., class, method). */
  type: SymbolType;
  /** The modifiers applied to the symbol. */
  modifiers: Modifier[];
  /** The child symbols of this symbol. */
  children: ExportedSymbol[];
  /** The file path where the symbol is located. */
  filepath: string;
  /** The syntax node representing the symbol. */
  node: Parser.SyntaxNode;
  /** The syntax node representing the identifier of the symbol. */
  idNode: Parser.SyntaxNode;
}

/**
 * Represents a Java class or similar construct (e.g., interface, enum).
 */
export class JavaClass implements ExportedSymbol {
  /** The name of the class. */
  name: string;
  /** The type of the class (e.g., class, interface). */
  type: SymbolType;
  /** The modifiers applied to the class. */
  modifiers: Modifier[];
  /** The child symbols of the class. */
  children: ExportedSymbol[];
  /** The file path where the class is located. */
  filepath: string;
  /** The syntax node representing the class. */
  node: Parser.SyntaxNode;
  /** The syntax node representing the identifier of the class. */
  idNode: Parser.SyntaxNode;
  /** The number of type parameters the class has. */
  typeParamCount: number;
  /** The name of the superclass, if any. */
  superclass?: string;
  /** The list of interfaces implemented by the class. */
  interfaces: string[];

  /**
   * Constructs a new JavaClass instance.
   * @param node - The syntax node representing the class.
   * @param type - The type of the class (e.g., class, interface).
   * @param filepath - The file path where the class is located.
   */
  constructor(node: Parser.SyntaxNode, type: SymbolType, filepath: string) {
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
        ).map((c) =>
          new JavaClass(c, c.type.split("_")[0] as SymbolType, filepath)
        ),
      );
      this.children.push(
        ...JAVA_STATIC_MEMBERS_QUERY.captures(bodyNode).map((c) =>
          new JavaMember(c, filepath)
        ),
      );
    }
    this.type = type;
    this.node = node;
    this.filepath = filepath;
  }
}

/**
 * Represents a member of a Java class (e.g., method, field).
 */
export class JavaMember implements ExportedSymbol {
  /** The name of the member. */
  name: string;
  /** The type of the member (e.g., method, field). */
  type: SymbolType;
  /** The modifiers applied to the member. */
  modifiers: Modifier[];
  /** The child symbols of the member. */
  children: ExportedSymbol[];
  /** The syntax node representing the member. */
  node: Parser.SyntaxNode;
  /** The syntax node representing the identifier of the member. */
  idNode: Parser.SyntaxNode;
  /** The file path where the member is located. */
  filepath: string;

  /**
   * Constructs a new JavaMember instance.
   * @param capture - The query capture representing the member.
   * @param filepath - The file path where the member is located.
   */
  constructor(capture: Parser.QueryCapture, filepath: string) {
    this.type = capture.name as SymbolType;
    this.node = capture.node;
    this.filepath = filepath;
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
