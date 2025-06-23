import Parser from "tree-sitter";
import { phpParser } from "../../../helpers/treeSitter/parsers.ts";
import {
  PHP_CLASS,
  PHP_CONSTANT,
  PHP_FUNCTION,
  PHP_INTERFACE,
  PHP_TRAIT,
  PHP_VARIABLE,
  type SymbolType,
} from "./types.ts";

export const INTERESTING_NODES = new Map<string, SymbolType>([
  ["const_declaration", PHP_CONSTANT],
  ["function_definition", PHP_FUNCTION],
  ["class_declaration", PHP_CLASS],
  ["interface_declaration", PHP_INTERFACE],
  ["expression_statement", PHP_VARIABLE],
  ["function_call_expression", PHP_CONSTANT],
  ["trait_declaration", PHP_TRAIT],
]);

export const PHP_IDNODE_QUERY = new Parser.Query(
  phpParser.getLanguage(),
  `
  [
  (expression_statement
  (assignment_expression
  left: (variable_name
  (name) @name)))

  (const_declaration
  (const_element
  (name) @name ))

  (expression_statement
  (reference_assignment_expression
  left: (variable_name
  (name) @name)))

  (function_definition
  name: (name) @name)

  (class_declaration
  name: (name) @name)

  (trait_declaration
  name: (name) @name)

  (interface_declaration
  name: (name) @name)

  (namespace_definition
  name: (_) @name)

  (function_call_expression
  arguments: (arguments
  . (argument (string (string_content) @name))
  ))
  ]
  `,
);
