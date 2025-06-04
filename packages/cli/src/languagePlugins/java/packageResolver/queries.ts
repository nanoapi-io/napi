import Parser from "npm:tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

export const JAVA_PROGRAM_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `(program [
  (package_declaration (_) @package)
  (import_declaration (_) @import)
  (class_declaration) @class
  (interface_declaration) @interface
  (enum_declaration) @enum
  (record_declaration) @record
  (annotation_type_declaration) @annotation
  ])`,
);
