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
    (type_definition
    	type:[
        	(struct_specifier
            name: (_)) @struct
            (struct_specifier !name)
            (enum_specifier
            name: (_)) @enum
            (enum_specifier !name)
            (union_specifier
            name: (_)) @union
            (union_specifier !name)
            (type_identifier)
            (primitive_type)
        ]
    ) @typedef
  ])
  (preproc_ifdef
  [
    (declaration) @decl
    (struct_specifier) @struct
    (enum_specifier) @enum
    (union_specifier) @union
    (type_definition
    	type:[
        	(struct_specifier
            name: (_)) @struct
            (struct_specifier !name)
            (enum_specifier
            name: (_)) @enum
            (enum_specifier !name)
            (union_specifier
            name: (_)) @union
            (union_specifier !name)
            (type_identifier)
            (primitive_type)
        ]
    ) @typedef
  ])
  (preproc_def) @variable
  (preproc_function_def) @function
  `,
);
