import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";

export const C_INVOCATION_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (type_identifier) @type
  (identifier) @id
  `, // The nuclear option, but unlike C# we can afford to do it.
);

export const C_MACRO_CONTENT_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (preproc_arg) @macro
  `,
);
