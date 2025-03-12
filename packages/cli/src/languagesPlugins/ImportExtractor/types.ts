import Parser from "tree-sitter";
import { EntityType, ExportMap } from "../ExportExtractor/types";

/**
 * Represents an imported entity, such as a function, class, or variable.
 */
export interface ImportEntity {
  /** The type of the imported entity (e.g., function, class, variable). */
  type: EntityType;
  /** The syntax node corresponding to the imported entity. */
  entityNode: Parser.SyntaxNode;
  /** The identifier node of the imported entity. */
  entityIdentifierNode: Parser.SyntaxNode;
  /** (Optional) Alias node if the entity is imported under a different name (`import { foo as bar }`). */
  entityAliasNode?: Parser.SyntaxNode;
}

/**
 * Represents a single module or package being imported.
 */
export interface ImportModule {
  /** The original module name, package, or file path specified in the import statement. */
  source: string;
  /** Whether the module is imported using a wildcard (`import *` or `#include <stdio.h>`). */
  isWildcard: boolean;
  /** Whether the module is external (e.g., from a third-party package) or internal (within the project). */
  isExternal: boolean;
  /** The resolved file path if the module is internal; `undefined` if the module is external. */
  resolvedSource?: string;
  /** The syntax node representing the module being imported. */
  moduleNode: Parser.SyntaxNode;
  /** The identifier node of the module (`import moduleName`). */
  moduleIdentifierNode: Parser.SyntaxNode;
  /** (Optional) Alias node if the module is imported under an alternative name (`import moduleName as alias`). */
  moduleAliasNode?: Parser.SyntaxNode;
  /**
   * A list of specific entities (functions, classes, variables) imported from this module.
   * - If empty, it represents a wildcard import (`import os` or `#include <stdio.h>`).
   */
  entities: ImportEntity[];
}

export const pythonRegularModule = "python-regular";
export const pythonFromModule = "python-from";

export type PythonImportType =
  | typeof pythonRegularModule
  | typeof pythonFromModule;
export type ImportModuleType = PythonImportType;

/**
 * Represents an import statement in the source code.
 */
export interface ImportStatement {
  /** The syntax node corresponding to the entire import statement. */
  statementNode: Parser.SyntaxNode;
  /** A list of modules or namespaces imported within this statement. */
  modules: ImportModule[];
  /**
   * The type of import statement, categorized by programming language:
   * - `"python-regular"` → Python `import module`
   * - `"python-from"` → Python `from module import foo`
   */
  type: ImportModuleType;
}

/**
 * Represents a mapping of file paths to their extracted import information.
 */
export type ImportMap = Record<
  string,
  {
    /** The absolute file path of the analyzed source file. */
    filePath: string;
    /** The detected programming language of the file (e.g., `"python"`, `"javascript"`, `"cpp"`). */
    language: string;
    /** Indicates whether the file could not be processed due to syntax errors or unsupported formats. */
    couldNotProcess: boolean;
    /** A list of extracted import statements found within the file. */
    importStatements: ImportStatement[];
  }
>;

/**
 * Abstract base class for extracting import statements from source files.
 * Each programming language should provide a concrete implementation.
 */
export abstract class ImportExtractor {
  /** The Tree-sitter parser instance used for analyzing source code. */
  public parser: Parser;

  /**
   * Initializes the import extractor with a Tree-sitter parser.
   * @param parser - The Tree-sitter parser instance configured for the target language.
   */
  constructor(parser: Parser) {
    this.parser = parser;
  }

  /**
   * Extracts import statements from a parsed source file.
   * @param filePath - The absolute path of the file being analyzed.
   * @param rootNode - The root node of the parsed syntax tree.
   * @param exportMap - A mapping of known exports to help resolve internal imports.
   * @returns A list of detected import statements within the file.
   */
  abstract run(
    filePath: string,
    rootNode: Parser.SyntaxNode,
    exportMap: ExportMap,
  ): ImportStatement[];
}

/**
 * Error class for handling unsupported file extensions in import extraction.
 */
export class UnsupportedExtensionForImportExtractorError extends Error {
  /** The unsupported file extension that triggered the error. */
  extension: string;

  /**
   * Constructs an error instance for unsupported file extensions.
   * @param extension - The file extension that is not supported.
   */
  constructor(extension: string) {
    super(`Unsupported extension: "${extension}" for import extractor`);
    this.extension = extension;
  }
}
