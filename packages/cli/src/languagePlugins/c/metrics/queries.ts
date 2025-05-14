import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.js";

// Tree-sitter query to find complexity-related nodes
export const C_COMPLEXITY_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
    (if_statement) @complexity
    (while_statement) @complexity
    (for_statement) @complexity
    (do_statement) @complexity
    (case_statement) @complexity
    (conditional_expression) @complexity
    (preproc_ifdef) @complexity
  `,
);

export const C_COMMENT_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `
    (comment) @comment
  `,
);
