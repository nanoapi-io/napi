import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.js";

export const C_FUNCTION_DEF_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
    (function_definition) @fdef
  `,
);

export const C_TYPEDEF_TYPE_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
    (type_definition
    type: [
  	(type_identifier) @name
        (struct_specifier name: (type_identifier) @name)
        (enum_specifier name: (type_identifier) @name)
        (union_specifier name: (type_identifier) @name)
    ])
  `,
);
