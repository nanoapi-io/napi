import Parser from "tree-sitter";
import { phpParser } from "../../../helpers/treeSitter/parsers.ts";

export const PHP_INVOCATION_QUERY = new Parser.Query(
  phpParser.getLanguage(),
  `
  (name) @name
  (qualified_name) @qualified
  `,
);
