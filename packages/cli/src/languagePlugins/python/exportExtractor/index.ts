import Parser from "tree-sitter";
import {
  PYTHON_CLASS_TYPE,
  PYTHON_FUNCTION_TYPE,
  PYTHON_VARIABLE_TYPE,
  type PythonSymbol,
  type PythonSymbolType,
} from "./types.ts";

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
 * - Tracks all nodes for each symbol, including multiple definitions and modifications.
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
    // - Top-level variable modifications with their identifier captured as @variableModifier
    // - Attribute assignments (app.attr = value)
    // - Nested attribute assignments (app.conf.attr = value)
    // - Method calls (app.method())
    // - Nested method calls (app.conf.update())
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
            
            ; Top-level variable modifications (augmented assignments like +=, -=, etc.)
            (expression_statement
              (augmented_assignment
                left: (identifier) @variableModifier
              )
            ) @variableMod
            
            ; Top-level variable modifications in regular assignments (reassignments)
            (expression_statement
              (assignment
                left: (
                  (identifier) @variableModifier
                  (#not-eq? @variableModifier "__all__")
                )
              )
            ) @variableMod
            
            ; Attribute assignments (app.attr = value)
            (expression_statement
              (assignment
                left: (attribute
                  object: (identifier) @variableModifier
                )
              )
            ) @variableMod

            ; Nested attribute assignments (app.conf.attr = value)
            (expression_statement
              (assignment
                left: (attribute
                  object: (attribute
                    object: (identifier) @variableModifier
                  )
                )
              )
            ) @variableMod

            ; Method calls (app.method())
            (expression_statement
              (call
                function: (attribute
                  object: (identifier) @variableModifier
                )
              )
            ) @variableMod

            ; Nested method calls (app.conf.update())
            (expression_statement
              (call
                function: (attribute
                  object: (attribute
                    object: (identifier) @variableModifier
                  )
                )
              )
            ) @variableMod
            
            ; Subscript assignments (obj[key] = value)
            (expression_statement
              (assignment
                left: (subscript
                  value: (identifier) @variableModifier
                )
              )
            ) @variableMod
            
            ; Nested subscript assignments (obj.attr[key] = value)
            (expression_statement
              (assignment
                left: (subscript
                  value: (attribute
                    object: (identifier) @variableModifier
                  )
                )
              )
            ) @variableMod
            
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
   *   - Variable modifications at the top level.
   *   - The __all__ assignment to obtain public symbol names.
   * - Constructs Symbol objects for each definition using:
   *   - The outer node capture (e.g. @class, @function, or @variable).
   *   - Its associated identifier capture (e.g. @classIdentifier, @functionIdentifier, or @variableIdentifier).
   * - Tracks all nodes for each symbol, including multiple definitions and modifications.
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

    // Use a map to collect all nodes for each symbol
    const symbolsMap = new Map<
      string,
      {
        id: string;
        type: PythonSymbolType;
        nodes: Parser.SyntaxNode[];
        identifierNode: Parser.SyntaxNode;
      }
    >();

    let publicSymbols: string[] | undefined = undefined;

    // Execute the combined query on the AST
    const matches = this.symbolQuery.matches(file.rootNode);

    matches.forEach(({ captures }) => {
      let symbolType: PythonSymbolType | undefined;
      let symbolNode: Parser.SyntaxNode | undefined;
      let identifierNode: Parser.SyntaxNode | undefined;
      let isModification = false;

      captures.forEach((capture) => {
        // If the capture name indicates an outer definition,
        // record its node and determine its type.
        if (
          ["class", "function", "variable", "variableMod"].includes(
            capture.name,
          )
        ) {
          symbolNode = capture.node;

          if (capture.name === "class") {
            symbolType = PYTHON_CLASS_TYPE;
          } else if (capture.name === "function") {
            symbolType = PYTHON_FUNCTION_TYPE;
          } else if (
            capture.name === "variable" ||
            capture.name === "variableMod"
          ) {
            symbolType = PYTHON_VARIABLE_TYPE;
            isModification = capture.name === "variableMod";
          }
        }

        // If the capture is an identifier for the definition or modification,
        // store it as the identifier node.
        if (
          [
            "classIdentifier",
            "functionIdentifier",
            "variableIdentifier",
            "variableModifier",
          ].includes(capture.name)
        ) {
          identifierNode = capture.node;
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

      // When we have all parts of a symbol, update the symbols map
      if (symbolType && symbolNode && identifierNode) {
        const symbolId = identifierNode.text;

        if (symbolsMap.has(symbolId)) {
          // If this symbol already exists, add this node to its nodes array
          const existingSymbol = symbolsMap.get(symbolId);

          // For classes, functions, and variable modifications
          if (existingSymbol) {
            // Check if this node is already in the array (to avoid duplicates)
            const isDuplicate = existingSymbol.nodes.some(
              (node) =>
                node.startPosition.row === symbolNode?.startPosition.row &&
                node.startPosition.column === symbolNode?.startPosition.column,
            );

            if (!isDuplicate) {
              // Only add modifications to existing variable symbols, not creating a new variable symbol
              if (isModification && symbolType === PYTHON_VARIABLE_TYPE) {
                existingSymbol.nodes.push(symbolNode);
              } // For classes and functions with multiple definitions, add each occurrence
              else if (
                !isModification &&
                (symbolType === PYTHON_CLASS_TYPE ||
                  symbolType === PYTHON_FUNCTION_TYPE)
              ) {
                existingSymbol.nodes.push(symbolNode);
              } // For non-modification variable assignments, if the symbol already exists,
              // add the node to track reassignments
              else if (!isModification && symbolType === PYTHON_VARIABLE_TYPE) {
                existingSymbol.nodes.push(symbolNode);
              }
            }
          }
        } else {
          // If it's a new symbol or not a modification, add it to the map
          if (!isModification) {
            symbolsMap.set(symbolId, {
              id: symbolId,
              type: symbolType,
              nodes: [symbolNode],
              identifierNode,
            });
          }
        }
      }
    });

    // Convert the map to an array of symbols
    const symbols: PythonSymbol[] = Array.from(symbolsMap.values());

    const result = {
      symbols,
      publicSymbols,
    };

    // Cache the result for future lookups.
    this.cache.set(cacheKey, result);

    return result;
  }
}
