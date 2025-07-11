import Parser from "tree-sitter";
import { phpParser } from "../../../helpers/treeSitter/parsers.ts";

export const PHP_USE_DETECTION_QUERY = new Parser.Query(
  phpParser.getLanguage(),
  `
  (namespace_use_declaration
    (namespace_use_clause) @use
  )
  `,
);

export const PHP_INCLUDE_QUERY = new Parser.Query(
  phpParser.getLanguage(),
  `
  (include_expression (string (string_content) @includestr))
  (include_once_expression (string (string_content) @includestr))
  (require_expression (string (string_content) @includestr))
  (require_once_expression (string (string_content) @includestr))

  (include_expression (binary_expression) @includebin)
  (include_once_expression (binary_expression) @includebin)
  (require_expression (binary_expression) @includebin)
  (require_once_expression (binary_expression) @includebin)
  `,
);
