import {
  ExportedSymbol,
  StorageClassSpecifier,
  SymbolType,
  TypeQualifier,
} from "./types.js";
import { C_DECLARATION_QUERY } from "./queries.js";
import { cParser } from "../../../helpers/treeSitter/parsers.js";
import Parser from "tree-sitter";

export class CHeaderResolver {
  parser: Parser = cParser;

  /**
   * Resolves the symbols in a C header file.
   * @param file The file to resolve.
   * @returns An array of exported symbols.
   */
  resolveSymbols(file: {
    path: string;
    rootNode: Parser.SyntaxNode;
  }): ExportedSymbol[] {
    const exportedSymbols: ExportedSymbol[] = [];
    const query = C_DECLARATION_QUERY;
    const captures = query.captures(file.rootNode);
    for (const capture of captures) {
      if (capture.name !== "decl") {
        const idNode = capture.node.childForFieldName("name");
        exportedSymbols.push({
          name: idNode.text,
          type: capture.name as SymbolType,
          node: capture.node,
          identifierNode: idNode,
          filepath: file.path,
          specifiers: [],
          qualifiers: [],
        });
      } else {
        const specifiers = capture.node.children
          .filter((child) => child.type === "storage_class_specifier")
          .map((child) => child.text);
        const qualifiers = capture.node.children
          .filter((child) => child.type === "type_qualifier")
          .map((child) => child.text);
        // Check if the node is a function or variable declaration
        const type =
          capture.node.descendantsOfType("function_declarator").length !== 0
            ? "function"
            : "variable";
        let currentNode = capture.node;
        // Traverse the tree to find the identifier node
        // This is a workaround for the fact that the identifier node is not always the first child
        // (e.g. in pointers or arrays)
        while (
          currentNode.childForFieldName("declarator").type !== "identifier"
        ) {
          currentNode = currentNode.childForFieldName("declarator");
        }
        const idNode = currentNode.childForFieldName("declarator");
        exportedSymbols.push({
          name: idNode.text,
          type: type as SymbolType,
          node: capture.node,
          identifierNode: idNode,
          filepath: file.path,
          specifiers: specifiers as StorageClassSpecifier[],
          qualifiers: qualifiers as TypeQualifier[],
        });
      }
    }
    return exportedSymbols;
  }
}
