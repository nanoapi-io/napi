import Parser from "tree-sitter";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  ImportMember,
  ImportStatement,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "./types.js";

/**
 * PythonImportExtractor parses and extracts Python import statements (normal and from-import).
 *
 * It specifically does the following:
 *  - Parses Python files using Tree-sitter.
 *  - Identifies standard import statements (`import module`) and extracts their identifiers and aliases.
 *  - Identifies from-import statements (`from module import X`) and extracts module names, imported items, aliases, and wildcard imports.
 *  - Caches results to optimize performance on subsequent calls.
 *
 * Dependencies (assumed provided externally):
 *  - Tree-sitter parser for AST parsing.
 *  - A map of files with their paths and parsed AST root nodes.
 *
 * Usage example:
 * ```typescript
 * // Get import statements for a Python file
 * const importStatements = importExtractor.getImportStatements(filePath);
 * // Process them to understand imports and dependencies
 * for (const stmt of importStatements) {
 *   if (stmt.type === NORMAL_IMPORT_STATEMENT_TYPE) {
 *     // Handle regular imports
 *   } else {
 *     // Handle from-imports
 *   }
 * }
 * ```
 */
export class PythonImportExtractor {
  /**
   * Map of file paths to their parsed AST root nodes
   * Used to access file content for analysis
   */
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  /**
   * Tree-sitter parser for Python code
   * Used to parse import statements
   */
  private parser: Parser;

  /**
   * Tree-sitter query to find import statements in Python code
   * This identifies both normal imports and from-imports
   */
  private importQuery: Parser.Query;

  /**
   * Cache for import statements
   * Maps file paths to their parsed import statements
   * Used to avoid reprocessing files already analyzed
   */
  private cache = new Map<string, ImportStatement[]>();

  /**
   * Constructs a new PythonImportExtractor.
   *
   * @param parser - A Tree-sitter parser instance for Python.
   * @param files - A map of file paths to objects containing their AST root nodes.
   */
  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.parser = parser;
    this.files = files;

    // Single query to capture all import statements
    this.importQuery = new Parser.Query(
      this.parser.getLanguage(),
      `[
        (import_statement) @import
        (import_from_statement) @import
      ]`,
    );
  }

  /**
   * Extracts all import statements (both normal and from-import) from the specified file.
   * Uses caching to optimize repeated calls.
   *
   * @param filePath - Path to the Python file being analyzed.
   * @returns An array of resolved ImportStatement objects for the given file.
   */
  public getImportStatements(filePath: string): ImportStatement[] {
    const cachedValue = this.cache.get(filePath);
    if (cachedValue) {
      return cachedValue;
    }

    const file = this.files.get(filePath);
    if (!file) {
      console.error(`File ${filePath} not found in files map`);
      return [];
    }

    const importStatements: ImportStatement[] = [];

    // Process all matched import statements
    this.importQuery.captures(file.rootNode).forEach(({ node }) => {
      if (node.type === "import_statement") {
        importStatements.push(this.processNormalImport(node));
      } else if (node.type === "import_from_statement") {
        importStatements.push(this.processFromImport(node));
      }
    });

    this.cache.set(filePath, importStatements);
    return importStatements;
  }

  /**
   * Processes a normal import statement (`import module`) by manually extracting
   * its components from the AST.
   *
   * @param node - The import_statement syntax node
   * @returns A resolved ImportStatement object
   */
  private processNormalImport(node: Parser.SyntaxNode): ImportStatement {
    const importStatement: ImportStatement = {
      node,
      type: NORMAL_IMPORT_STATEMENT_TYPE,
      sourceNode: undefined,
      members: [],
    };

    // Retrieve imported modules and optional aliases
    const memberNodes = node.childrenForFieldName("name");
    memberNodes.forEach((memberNode) => {
      let identifierNode: Parser.SyntaxNode;
      let aliasNode: Parser.SyntaxNode | undefined;

      if (memberNode.type === "aliased_import") {
        const nameNode = memberNode.childForFieldName("name");
        if (!nameNode) {
          throw new Error("Malformed aliased import: missing name");
        }
        identifierNode = nameNode;
        aliasNode = memberNode.childForFieldName("alias") || undefined;
      } else {
        identifierNode = memberNode;
        aliasNode = undefined;
      }

      importStatement.members.push({
        node: memberNode,
        identifierNode,
        aliasNode,
        isWildcardImport: false,
        items: undefined,
      });
    });

    return importStatement;
  }

  /**
   * Processes a from-import statement (`from module import X`) by manually extracting
   * its components from the AST.
   *
   * @param node - The import_from_statement syntax node
   * @returns A resolved ImportStatement object
   */
  private processFromImport(node: Parser.SyntaxNode): ImportStatement {
    const sourceNode = node.childForFieldName("module_name");
    if (!sourceNode) {
      throw new Error("Malformed from-import: missing module name");
    }

    const importStatement: ImportStatement = {
      node,
      type: FROM_IMPORT_STATEMENT_TYPE,
      sourceNode,
      members: [],
    };

    const importMember: ImportMember = {
      node: sourceNode,
      identifierNode: sourceNode,
      aliasNode: undefined,
      isWildcardImport: false,
      items: undefined,
    };

    const wildcardNode = node.descendantsOfType("wildcard_import")[0];

    if (wildcardNode) {
      importMember.isWildcardImport = true;
    } else {
      const itemNodes = node.childrenForFieldName("name");
      importMember.items = itemNodes.map((itemNode) => {
        let identifierNode: Parser.SyntaxNode;
        let aliasNode: Parser.SyntaxNode | undefined;

        if (itemNode.type === "aliased_import") {
          const nameNode = itemNode.childForFieldName("name");
          if (!nameNode) {
            throw new Error("Malformed aliased import item: missing name");
          }
          identifierNode = nameNode;
          aliasNode = itemNode.childForFieldName("alias") || undefined;
        } else {
          identifierNode = itemNode;
          aliasNode = undefined;
        }

        return {
          node: itemNode,
          identifierNode,
          aliasNode,
        };
      });
    }

    importStatement.members.push(importMember);
    return importStatement;
  }
}
