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
            body: (_)) @struct
            (struct_specifier !body)
            (enum_specifier
            body: (_)) @enum
            (enum_specifier !body)
            (union_specifier
            body: (_)) @union
            (union_specifier !body)
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
            body: (_)) @struct
            (struct_specifier !body)
            (enum_specifier
            body: (_)) @enum
            (enum_specifier !body)
            (union_specifier
            body: (_)) @union
            (union_specifier !body)
            (type_identifier)
            (primitive_type)
        ]
    ) @typedef
  ])
  (preproc_def) @variable
  (preproc_function_def) @function
  `,
);
