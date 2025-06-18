import Parser from "npm:tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

/**
 * A Tree-sitter query to match Java method or type invocations.
 * This query captures scoped type identifiers, type identifiers, and identifiers.
 */
export const JAVA_INVOCATION_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
  [
  (scoped_type_identifier)
  (type_identifier)
  (identifier)
  ] @any
  `,
);

/**
 * A Tree-sitter query to match Java variable declarations and formal parameters.
 * This query captures variable declarators and formal parameter names.
 */
export const JAVA_VARIABLES_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
  (variable_declarator name: (_) @var)
  (formal_parameter name: (_) @var)
  `,
);
