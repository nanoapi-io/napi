import Parser from "npm:tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

/**
 * A Tree-sitter query to extract high-level program elements from Java source code.
 * This query captures:
 * - Package declarations
 * - Import statements
 * - Class declarations
 * - Interface declarations
 * - Enum declarations
 * - Record declarations
 * - Annotation type declarations
 */
export const JAVA_PROGRAM_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `(program [
  (package_declaration (_) @package)
  (import_declaration) @import
  (class_declaration) @class
  (interface_declaration) @interface
  (enum_declaration) @enum
  (record_declaration) @record
  (annotation_type_declaration) @annotation
  ])`,
);

/**
 * A Tree-sitter query to extract public static members from Java source code.
 * This query captures:
 * - Public static field declarations
 * - Public static method declarations
 */
export const JAVA_STATIC_MEMBERS_QUERY = new Parser.Query(
  javaParser.getLanguage(),
  `
  (field_declaration (modifiers "public" "static")) @field
  (method_declaration (modifiers "public" "static")) @method
  `,
);
