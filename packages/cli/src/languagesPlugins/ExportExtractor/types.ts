import Parser from "tree-sitter";

/**
 * Represents an exported member (e.g., function, class, variable).
 */
export interface ExportMember {
  /** The type of the exported member (e.g., `"function"`, `"class"`, `"variable"`). */
  type: string;
  /** The syntax node representing the entire exported member. */
  node: Parser.SyntaxNode;
  /** The syntax node of the identifier (e.g., function or class name). */
  identifierNode: Parser.SyntaxNode;
  /** (Optional) Alias node if the member is renamed during export (`export { foo as myFoo }`). */
  aliasNode?: Parser.SyntaxNode;
}

/**
 * Represents an export statement in a file.
 */
export interface ExportStatement {
  /** The export type: `"default"`, `"named"`, or `"wildcard"`. */
  type: "default" | "named" | "wildcard";
  /** The syntax node representing the full export statement. */
  node: Parser.SyntaxNode;
  /** The members exported by this statement (empty for wildcard exports). */
  members: ExportMember[];
}

/**
 * Represents a mapping of file paths to their extracted export information.
 */
export type ExportMap = Record<
  string,
  {
    /** The file path being analyzed. */
    filePath: string;
    /** The detected programming language (e.g., `"python"`, `"javascript"`). */
    language: string;
    /** Whether the file could not be processed due to parsing issues. */
    couldNotProcess: boolean;
    /** A list of detected export statements from the file. */
    exportStatements: ExportStatement[];
  }
>;

/**
 * Abstract class for extracting exports from source files.
 * Each language should provide its own implementation.
 */
export abstract class ExportExtractor {
  /** The Tree-sitter parser instance used for analyzing source code. */
  public parser: Parser;

  /**
   * Initializes the export extractor with a Tree-sitter parser.
   * @param parser - The Tree-sitter parser instance for a specific language.
   */
  constructor(parser: Parser) {
    this.parser = parser;
  }

  /**
   * Extracts export statements from a parsed syntax tree.
   * @param filePath - The path to the file being analyzed.
   * @param rootNode - The root syntax node of the parsed file.
   * @returns A list of detected export statements.
   */
  abstract run(
    filePath: string,
    rootNode: Parser.SyntaxNode,
  ): ExportStatement[];
}

/**
 * Error thrown when an unsupported file extension is encountered during export extraction.
 */
export class UnsupportedExtensionForExportExtractorError extends Error {
  /** The unsupported file extension that caused the error. */
  extension: string;

  /**
   * Creates an error instance for unsupported file extensions.
   * @param extension - The unsupported file extension.
   */
  constructor(extension: string) {
    super(`Unsupported extension: "${extension}" for export extractor`);
    this.extension = extension;
  }
}
