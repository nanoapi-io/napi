import Parser from "npm:tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

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

export const JAVA_VARIABLES_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
  (variable_declarator name: (_) @var)
  (formal_parameter name: (_) @var)
  `,
);
