import { cParser } from "../../../helpers/treeSitter/parsers.js";
import Parser from "tree-sitter";

/** Query that catches every declaration except typedefs in a header file */
export const C_DECLARATION_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (translation_unit
  [
    (declaration) @decl
    (struct_specifier) @struct
    (enum_specifier) @enum
    (union_specifier) @union
  ])
  (preproc_ifdef
  [
    (declaration) @decl
    (struct_specifier) @struct
    (enum_specifier) @enum
    (union_specifier) @union
  ])
  (preproc_def) @variable
  (preproc_function_def) @function
  `,
);
