import { cParser } from "../../../helpers/treeSitter/parsers.ts";
import Parser from "tree-sitter";

/** Query that catches every declaration including macros in a header file
 * Does not catch function definitions
 */
export const C_DECLARATION_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
  (translation_unit
  [
    (declaration) @decl
    (struct_specifier
    name: (_)) @struct
    (enum_specifier) @enum
    (union_specifier
    name: (_)) @union
    (function_definition) @function_definition
    (type_definition
    	type:[
        	(struct_specifier
            name: (_)
            body: (_)) @struct
            (struct_specifier !name)
            (struct_specifier !body)
            (enum_specifier
            name: (_)
            body: (_)) @enum
            (enum_specifier !name)
            (enum_specifier !body)
            (union_specifier
            name: (_)
            body: (_)) @union
            (union_specifier !name)
            (union_specifier !body)
            (type_identifier)
            (primitive_type)
        ]
    ) @typedef
  ])
  (preproc_ifdef
  [
    (declaration) @decl
    (struct_specifier
    name: (_)) @struct
    (enum_specifier) @enum
    (union_specifier
    name: (_)) @union
    (function_definition) @function_definition
    (type_definition
    	type:[
        	(struct_specifier
            name: (_)
            body: (_)) @struct
            (struct_specifier !name)
            (struct_specifier !body)
            (enum_specifier
            name: (_)
            body: (_)) @enum
            (enum_specifier !name)
            (enum_specifier !body)
            (union_specifier
            name: (_)
            body: (_)) @union
            (union_specifier !name)
            (union_specifier !body)
            (type_identifier)
            (primitive_type)
        ]
    ) @typedef
  ])
  (preproc_def) @macro_constant
  (preproc_function_def) @macro_function
  `,
);
