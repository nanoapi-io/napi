import type {
  ExportedSymbol,
  StorageClassSpecifier,
  SymbolType,
  TypeQualifier,
} from "./types.ts";
import { C_DECLARATION_QUERY } from "./queries.ts";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";
import type Parser from "tree-sitter";

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
      if (capture.name !== "decl" && capture.name !== "function_definition") {
        let idNode: Parser.SyntaxNode;
        if (capture.name !== "typedef") {
          if (!capture.node.childForFieldName("name")) {
            throw new Error(`Couldn't find name for ${capture.node.text}`);
          }
          idNode = capture.node.childForFieldName("name") as Parser.SyntaxNode;
        } else {
          if (!capture.node.childForFieldName("declarator")) {
            throw new Error(`Couldn't find name for ${capture.node.text}`);
          }
          idNode = capture.node.childForFieldName(
            "declarator",
          ) as Parser.SyntaxNode;
        }
        if (!idNode) {
          continue;
        }
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
        let currentNode = capture.node;
        // Traverse the tree to find the identifier node
        // This is a workaround for the fact that the identifier node is not always the first child
        // (e.g. in pointers or arrays)
        while (
          !currentNode.childForFieldName("declarator") ||
          currentNode.childForFieldName("declarator")?.type !== "identifier"
        ) {
          if (!currentNode.childForFieldName("declarator")) {
            if (!currentNode.firstNamedChild) {
              throw new Error(
                `Could not find a named child for ${currentNode.text}`,
              );
            }
            currentNode = currentNode.firstNamedChild;
          } else {
            if (!currentNode.childForFieldName("declarator")) {
              throw new Error(
                `Could not find a declarator for ${currentNode.text}`,
              );
            }
            currentNode = currentNode.childForFieldName(
              "declarator",
            ) as Parser.SyntaxNode;
          }
        }
        const type = capture.name === "function_definition"
          ? "function_definition"
          : currentNode.type === "function_declarator"
          ? "function_signature"
          : "variable";
        const idNode = currentNode.childForFieldName("declarator");
        if (!idNode) {
          throw new Error(
            `Couldn't find identifier node for symbol :\n${capture.node.text}`,
          );
        }
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
