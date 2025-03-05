import Parser from "tree-sitter";
import { ExportMap } from "../ExportExtractor/types";

/**
 * Represents an imported identifier.
 */
export interface ImportIdentifier {
  /** Type of import (e.g., "named", "default", "namespace", "static"). */
  type: "named" | "default" | "namespace" | "static" | "wildcard";
  /** The syntax node of the identifier. */
  identifierNode: Parser.SyntaxNode;
  /** (Optional) Alias node for renamed imports (`import { foo as bar }`). */
  aliasNode?: Parser.SyntaxNode;
}

/**
 * Represents an import statement in a file.
 */
export interface ImportStatement {
  /** The raw module or file path in the import statement. */
  source: string;
  /** Whether the import is external (from a package) or internal. */
  isExternal: boolean;
  /** The resolved file path (for internal imports). */
  resolvedSource?: string;
  /** The syntax node of the entire import statement. */
  node: Parser.SyntaxNode;
  /** List of imported identifiers. */
  identifiers: ImportIdentifier[];
  /**
   * The kind of import statement, supporting multiple languages:
   * - `"python-regular"` → Python `import module` and `import module as alias`
   * - `"python-from"` → Python `from module import foo` and `from module import foo as bar`
   * - `"esm"` → JavaScript/TypeScript imports (`import { foo } from "mod"`)
   * - `"commonjs"` → JavaScript `require()`
   * - `"header"` → C/C++ `#include`
   * - `"static"` → Java static imports (`import static java.lang.Math.PI;`)
   * - `"php_use"` → PHP `use Namespace\Class`
   * - `"require"` → PHP `require` / `include`
   */
  kind:
    | "python-regular"
    | "python-from"
    | "esm"
    | "commonjs"
    | "header"
    | "static"
    | "php_use"
    | "require";
}

/**
 * Represents a map of all imports across files.
 */
export type ImportMap = Record<
  string,
  {
    filePath: string;
    language: string;
    couldNotProcess: boolean;
    importStatements: ImportStatement[];
  }
>;

/**
 * Abstract class for extracting imports from source files.
 */
export abstract class ImportExtractor {
  /** Tree-sitter parser instance. */
  public parser: Parser;
  /**
   * Initializes the import extractor.
   * @param parser - The Tree-sitter parser for the language.
   */
  constructor(parser: Parser) {
    this.parser = parser;
  }
  /**
   * Extracts import statements from a file.
   * @param filePath - Path to the file being analyzed.
   * @param rootNode - Parsed syntax tree root.
   * @returns List of detected import statements.
   */
  abstract run(
    filePath: string,
    rootNode: Parser.SyntaxNode,
    exportMap: ExportMap,
  ): ImportStatement[];
}

/**
 * Error for unsupported file extensions in import extraction.
 */
export class UnsupportedExtensionForImportExtractorError extends Error {
  extension: string;
  constructor(extension: string) {
    super(`Unsupported extension: "${extension}" for import extractor`);
    this.extension = extension;
  }
}
