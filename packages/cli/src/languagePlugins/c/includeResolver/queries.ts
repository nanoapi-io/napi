import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.js";

export const C_INCLUDE_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (preproc_include
  path: (string_literal
  (string_content) @include))
  `,
);

export const C_STANDARD_INCLUDE_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (preproc_include
  path: (system_lib_string)) @include
  `,
);
