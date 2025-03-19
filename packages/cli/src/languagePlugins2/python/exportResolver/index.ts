import Parser from "tree-sitter";

export const PYTHON_CLASS_TYPE = "class";
export const PYTHON_FUNCTION_TYPE = "function";
export const PYTHON_VARIABLE_TYPE = "variable";

export type SymbolType =
  | typeof PYTHON_CLASS_TYPE
  | typeof PYTHON_FUNCTION_TYPE
  | typeof PYTHON_VARIABLE_TYPE;

/**
 * Represents an exported symbol in a Python module.
 * Symbols can be classes, functions, or variables.
 */
export interface ExportedSymbol {
  id: string;
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  type: SymbolType;
  supportsWildcardImport: boolean;
}

/**
 * PythonExportResolver is responsible for extracting exported symbols (classes, functions, variables)
 * from a Python source file using Tree-sitter.
 *
 * This class:
 * - Analyzes Python source code to detect top-level symbols.
 * - Supports detection of decorated functions and classes.
 * - Uses caching to improve performance and prevent redundant computations.
 */
export class PythonExportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private parser: Parser;
  private cache = new Map<string, ExportedSymbol[]>(); // Caching extracted symbols for efficiency

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.parser = parser;
    this.files = files;
  }

  /**
   * Retrieves exported symbols from the cache if available.
   *
   * @param cacheKey A unique key representing the file's exported symbols.
   * @returns Cached exported symbols if available, otherwise undefined.
   */
  private getFromExportedSymbolCache(cacheKey: string) {
    return this.cache.get(cacheKey) || undefined;
  }

  /**
   * Extracts top-level class definitions, including decorated classes.
   *
   * @param fileNode The root syntax node of the file.
   * @returns A list of extracted class symbols.
   */
  private getClass(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];

    // Query for detecting class definitions
    const classQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (class_definition
            name: (identifier)
          ) @node
        )
      `,
    );

    // Extract class definitions
    const classCaptures = classQuery.captures(fileNode);
    classCaptures.forEach(({ node }) => {
      const identifierNode = node.childForFieldName("name");
      if (!identifierNode) {
        console.error("No identifier node found for class definition.");
        return;
      }

      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: PYTHON_CLASS_TYPE,
        supportsWildcardImport: false,
      });
    });

    // Query for decorated class definitions
    const decoratedClassQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (decorated_definition
            definition: (class_definition
              name: (identifier)
            )
          ) @node
        )
      `,
    );

    // Extract decorated class definitions
    const decoratedClassCaptures = decoratedClassQuery.captures(fileNode);
    decoratedClassCaptures.forEach(({ node }) => {
      const classNode = node.childForFieldName("definition");
      const identifierNode = classNode?.childForFieldName("name");
      if (!identifierNode) {
        console.error(
          "No identifier node found for decorated class definition.",
        );
        return;
      }

      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: PYTHON_CLASS_TYPE,
        supportsWildcardImport: false,
      });
    });

    return exportedSymbols;
  }

  /**
   * Extracts top-level function definitions, including decorated functions.
   *
   * @param fileNode The root syntax node of the file.
   * @returns A list of extracted function symbols.
   */
  private getFunctions(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];

    // Query for function definitions
    const functionQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (function_definition
            name: (identifier)
          ) @node
        )
      `,
    );

    // Extract function definitions
    const functionCaptures = functionQuery.captures(fileNode);
    functionCaptures.forEach(({ node }) => {
      const identifierNode = node.childForFieldName("name");
      if (!identifierNode) {
        console.error("No identifier node found for function definition.");
        return;
      }

      exportedSymbols.push({
        id: identifierNode.text,
        type: PYTHON_FUNCTION_TYPE,
        node,
        identifierNode,
        supportsWildcardImport: false,
      });
    });

    // Query for decorated function definitions
    const decoratedFunctionQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (decorated_definition
            definition: (function_definition
              name: (identifier)
            )
          ) @node
        )
      `,
    );

    // Extract decorated function definitions
    const decoratedFunctionCaptures = decoratedFunctionQuery.captures(fileNode);
    decoratedFunctionCaptures.forEach(({ node }) => {
      const functionNode = node.childForFieldName("definition");
      const identifierNode = functionNode?.childForFieldName("name");
      if (!identifierNode) {
        console.error(
          "No identifier node found for decorated function definition.",
        );
        return;
      }

      exportedSymbols.push({
        id: identifierNode.text,
        type: PYTHON_FUNCTION_TYPE,
        node,
        identifierNode,
        supportsWildcardImport: false,
      });
    });

    return exportedSymbols;
  }

  /**
   * Extracts top-level variable assignments.
   *
   * @param fileNode The root syntax node of the file.
   * @returns A list of extracted variable symbols.
   */
  private getVariable(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];

    // Query to find top-level variable assignments
    const assignmentQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (expression_statement
            (assignment
              left: (_)
              right: (_)?
            )
          ) @node
        )
      `,
    );

    // Extract variable assignments
    const assignmentCaptures = assignmentQuery.captures(fileNode);
    assignmentCaptures.forEach(({ node }) => {
      const assignmentNode = node.children.find(
        (child) => child.type === "assignment",
      );
      const identifierNode = assignmentNode?.childForFieldName("left");

      if (!identifierNode) {
        console.error("No identifier node found for variable assignment.");
        return;
      }
      if (identifierNode.text === "__all__") {
        // __all__ is a special variable that is used to define the symbols
        // that are exported when using `from module import *`
        // We don't want to include it in the list of exported symbols
        return;
      }

      if (identifierNode.type === "pattern_list") {
        // Handle multiple variables assigned in one statement
        identifierNode.children.forEach((child) => {
          if (child.type === "identifier") {
            exportedSymbols.push({
              id: child.text,
              type: PYTHON_VARIABLE_TYPE,
              node,
              identifierNode: child,
              supportsWildcardImport: false,
            });
          }
        });
      } else {
        exportedSymbols.push({
          id: identifierNode.text,
          type: PYTHON_VARIABLE_TYPE,
          node,
          identifierNode,
          supportsWildcardImport: false,
        });
      }
    });

    return exportedSymbols;
  }

  /**
   * Extracts the __all__ elements from a Python file.
   * Return empty list if __all__ is not defined.
   *
   * @param fileNode The root syntax node of the file.
   * @returns A list of exported symbols defined in the __all__ variable.
   */
  private get__all__(fileNode: Parser.SyntaxNode): string[] {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (expression_statement
            (assignment
              left: (identifier) @identifier (#eq? @identifier "__all__")
              right: (list
                (string
                  (string_content) @element
                )
              )
            )
          )
        )
      `,
    );

    const captures = query.captures(fileNode);

    const elements: string[] = [];
    captures.forEach(({ node, name }) => {
      if (name === "element") {
        elements.push(node.text);
      }
    });

    return elements;
  }

  /**
   * Retrieves all exported symbols (classes, functions, variables) from a given file.
   *
   * - Uses caching to avoid redundant computations.
   * - Extracts classes, functions, and variables.
   *
   * @param filePath The file to analyze.
   * @returns A list of exported symbols.
   */
  public getSymbols(filePath: string) {
    const cacheKey = `${filePath}|symbols`;

    // Return cached result if available
    const cacheValue = this.getFromExportedSymbolCache(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    // Ensure file exists before processing
    const file = this.files.get(filePath);
    if (!file) {
      console.error(`File ${filePath} not found in records.`);
      return [];
    }

    const exportedSymbols: ExportedSymbol[] = [];
    const fileNode = file.rootNode;

    exportedSymbols.push(...this.getClass(fileNode));
    exportedSymbols.push(...this.getFunctions(fileNode));
    exportedSymbols.push(...this.getVariable(fileNode));

    const __all__ = this.get__all__(fileNode);
    exportedSymbols.map((symbol) => {
      if (__all__.length > 0) {
        // If __all__ is defined, only symbols in __all__ are exported with wildcard import
        symbol.supportsWildcardImport = __all__.includes(symbol.id);
      } else {
        // If __all__ is not defined, all symbols are exported with wildcard import (default behavior)
        symbol.supportsWildcardImport = true;
      }
    });

    // Store result in cache
    this.cache.set(cacheKey, exportedSymbols);

    return exportedSymbols;
  }
}
