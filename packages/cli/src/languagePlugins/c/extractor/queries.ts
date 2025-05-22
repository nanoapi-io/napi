import Parser from "npm:tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";

export const C_IFDEF_QUERY = new Parser.Query(
  cParser.getLanguage(),
  `(preproc_ifdef
  name: (identifier) @def)`,
);
