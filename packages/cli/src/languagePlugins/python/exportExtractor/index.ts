import Parser from "tree-sitter";
import {
  PYTHON_CLASS_TYPE,
  PYTHON_FUNCTION_TYPE,
  PYTHON_VARIABLE_TYPE,
  PythonSymbol,
  PythonSymbolType,
} from "./types";

/**
 * PythonExportExtractor extracts exported symbols from a Python source file using Tree-sitter.
 *
 * This class performs the following:
 * - Analyzes Python source code to detect top-level definitions.
 * - Supports both plain and decorated class and function definitions.
 * - Extracts top-level variable assignments (ignoring __all__).
 * - Additionally, detects the __all__ assignment to extract public symbol names.
 * - Combines all these patterns in a single Tree-sitter query.
 * - Uses caching to improve performance by avoiding redundant computation.
 */
export class PythonExportExtractor {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private parser: Parser;
  private symbolQuery: Parser.Query;
  private cache = new Map<
    string,
    { symbols: PythonSymbol[]; publicSymbols: undefined | string[] }
  >(); // Cache results for efficiency

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.parser = parser;
    this.files = files;
    // This single query combines multiple patterns:
    // - Top-level class definitions (plain and decorated) with their name captured as @classIdentifier
    // - Top-level function definitions (plain and decorated) with their name captured as @functionIdentifier
    // - Top-level variable assignments (excluding __all__) with their identifier captured as @variableIdentifier
    // - An assignment for __all__ where the left side is captured as @allIdentifier (ensuring it equals "__all__")
    //   and the public element strings from the list are captured as @publicElement.
    this.symbolQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          ([
            ; Top-level classes (plain and decorated)
          	(class_definition
          		name: (identifier) @classIdentifier
          	) @class
            (decorated_definition
              definition: (class_definition
                name: (identifier) @classIdentifier
              )
            ) @class
            
            ; Top-level functions (plain and decorated)
          	(function_definition
              name: (identifier) @functionIdentifier
            ) @function
            (decorated_definition
              definition: (function_definition
                name: (identifier) @functionIdentifier
              )
            ) @function

            ; Top-level variables (ignoring __all__)
            (expression_statement
              (assignment
                left: (
                  (identifier) @variableIdentifier
                  (#not-eq? @variableIdentifier "__all__")
                )
              )
            ) @variable
            (expression_statement
              (assignment
                left: (pattern_list
                  (
                    (identifier) @variableIdentifier
                    (#not-eq? @variableIdentifier "__all__")
                  )
                )
              )
            ) @variable
            
            ; __all__ assignment to capture public symbols
            (expression_statement
              (assignment
                left: (identifier) @allIdentifier (#eq? @allIdentifier "__all__")
                right: (list
                  (string (string_content) @publicElement)
                )
              )
            )
          ])        
        )
      `,
    );
  }

  /**
   * Retrieves all exported symbols from the specified file.
   *
   * This method performs the following:
   * - Runs the combined Tree-sitter query on the file's AST to extract:
   *   - Top-level classes, functions, and variable definitions.
   *   - The __all__ assignment to obtain public symbol names.
   * - Constructs Symbol objects for each definition using:
   *   - The outer node capture (e.g. @class, @function, or @variable).
   *   - Its associated identifier capture (e.g. @classIdentifier, @functionIdentifier, or @variableIdentifier).
   * - Caches the result to prevent redundant parsing.
   *
   * @param filePath The path of the Python file to analyze.
   * @returns An object with two properties:
   *   - symbols: Array of extracted Symbol objects.
   *   - publicSymbols: Array of public symbol names from __all__, or undefined if not defined.
   */
  public getSymbols(filePath: string) {
    const cacheKey = `${filePath}|symbols`;

    // Return cached result if available
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    // Ensure the file exists in the provided map
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    const symbols: PythonSymbol[] = [];
    let publicSymbols: string[] | undefined = undefined;

    // Execute the combined query on the AST
    const matches = this.symbolQuery.matches(file.rootNode);

    matches.forEach(({ captures }) => {
      let symbolType: PythonSymbolType | undefined;
      let symbolNode: Parser.SyntaxNode | undefined;
      let identifierNode: Parser.SyntaxNode | undefined;

      captures.forEach((capture) => {
        // If the capture name indicates an outer definition,
        // record its node and determine its type.
        if (["class", "function", "variable"].includes(capture.name)) {
          symbolNode = capture.node;

          if (capture.name === "class") {
            symbolType = PYTHON_CLASS_TYPE;
          } else if (capture.name === "function") {
            symbolType = PYTHON_FUNCTION_TYPE;
          } else if (capture.name === "variable") {
            symbolType = PYTHON_VARIABLE_TYPE;
          }
        }

        // If the capture is an identifier for the definition,
        // store it as the identifier node.
        if (
          [
            "classIdentifier",
            "functionIdentifier",
            "variableIdentifier",
          ].includes(capture.name)
        ) {
          identifierNode = capture.node;
        }

        // When we have all parts of a symbol, create the symbol object.
        if (symbolType && symbolNode && identifierNode) {
          const symbol: PythonSymbol = {
            id: identifierNode.text,
            type: symbolType,
            node: symbolNode,
            identifierNode,
          };
          symbols.push(symbol);
        }

        // Capture public symbol elements from the __all__ assignment.
        if (capture.name === "publicElement") {
          if (!publicSymbols) {
            publicSymbols = [capture.node.text];
          } else {
            publicSymbols.push(capture.node.text);
          }
        }
      });
    });

    const result = {
      symbols,
      publicSymbols,
    };

    // Cache the result for future lookups.
    this.cache.set(cacheKey, result);

    return result;
  }
}
