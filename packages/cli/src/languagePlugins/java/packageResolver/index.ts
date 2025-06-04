import type Parser from "tree-sitter";
import type {
  ExportedSymbol,
  JavaFile,
  Modifier,
  SymbolType,
} from "./types.ts";
import { JAVA_PROGRAM_QUERY } from "./queries.ts";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

export class JavaPackageResolver {
  parser: Parser = javaParser;

  resolveFile(file: {
    path: string;
    rootNode: Parser.SyntaxNode;
  }): JavaFile {
    const captures = JAVA_PROGRAM_QUERY.captures(file.rootNode);
    const packagename = captures.find((c) => c.name === "package")?.node.text ??
      "";
    const imports = captures.filter((c) => c.name === "import").map((c) =>
      c.node.text
    );
    const declaration = captures.find((c) =>
      !["package", "import"].includes(c.name)
    );
    if (!declaration) {
      throw Error(`No declaration found for ${file.path}`);
    }
    const symbol = this.#processDeclaration(
      declaration.node,
      declaration.name as SymbolType,
    );
    return {
      path: file.path,
      rootNode: file.rootNode,
      symbol,
      package: packagename,
      imports,
    };
  }

  #processDeclaration(
    node: Parser.SyntaxNode,
    type: SymbolType,
  ): ExportedSymbol {
    const modifiersNode = node.children.find((c) => c.type === "modifiers");
    const modifiers: Modifier[] = [];
    if (modifiersNode) {
      modifiers.push(...modifiersNode.children.map((c) => c.text as Modifier));
    }
    const idNode = node.childForFieldName("name")!;
    const name = idNode.text;
    const typeParams = node.childForFieldName("type_parameters");
    let typeParamCount = 0;
    if (typeParams) {
      typeParamCount = typeParams.namedChildren.length;
    }
    let superclass: string | undefined = undefined;
    const superclassNode = node.childForFieldName("superclass");
    if (superclassNode) {
      superclass = superclassNode.namedChildren[0].text;
    }
    const interfacesNode = node.childForFieldName("interfaces");
    const interfaces: string[] = [];
    if (interfacesNode) {
      interfaces.push(
        ...interfacesNode.namedChildren[0].namedChildren.map((c) => c.text),
      );
    }
    const children: ExportedSymbol[] = [];
    const bodyNode = node.childForFieldName("body");
    if (bodyNode) {
      children.push(
        ...bodyNode.children.filter((c) =>
          [
            "class_declaration",
            "interface_declaration",
            "enum_declaration",
            "record_declaration",
            "annotation_type_declaration",
          ].includes(c.type)
        ).map((c) =>
          this.#processDeclaration(c, c.type.split("_")[0] as SymbolType)
        ),
      );
    }
    return {
      name,
      type,
      modifiers,
      typeParamCount,
      superclass,
      interfaces,
      children,
      node,
      idNode,
    };
  }
}
