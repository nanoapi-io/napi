import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";

export const C_ERROR_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (ERROR) @error
`,
);

export const C_UNNAMED_DATATYPE_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (translation_unit
  [
    (struct_specifier
    !name) @struct
    (union_specifier
    !name) @union
  ])
  (preproc_ifdef
  [
    (struct_specifier
    !name) @struct
    (union_specifier
    !name) @union
  ])
`,
);
