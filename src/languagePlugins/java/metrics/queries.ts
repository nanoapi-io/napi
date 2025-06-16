import Parser from "tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

// Tree-sitter query to find complexity-related nodes
export const JAVA_COMPLEXITY_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
    (if_statement) @complexity
    (while_statement) @complexity
    (for_statement) @complexity
    (do_statement) @complexity
    (switch_block_statement_group) @complexity
    (ternary_expression) @complexity
  `,
);

export const JAVA_COMMENT_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
    (comment) @comment
  `,
);
