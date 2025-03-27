import Parser from "tree-sitter";

/**
 * Represents an explicitly imported item within an import statement.
 * This item can be a class, function, module, or any valid Python identifier.
 */
export interface ImportItem {
  /** The syntax node corresponding to the entire imported item (including alias, if present). */
  node: Parser.SyntaxNode;

  /** The syntax node for the item's original identifier (e.g., "path" in "from os import path as p"). */
  identifierNode: Parser.SyntaxNode;

  /** The syntax node for the item's alias, if one is provided (e.g., "p" in "from os import path as p"). */
  aliasNode: Parser.SyntaxNode | undefined;
}

/**
 * Represents a member imported from a module. A member corresponds to either:
 * - A module imported entirely (`import module` or `import module as alias`).
 * - A module or symbol imported from another module (`from module import X` or `from module import *`).
 */
export interface ImportMember {
  /** The syntax node corresponding to the imported member (module or item). */
  node: Parser.SyntaxNode;

  /** The syntax node corresponding to the member’s identifier. */
  identifierNode: Parser.SyntaxNode;

  /** The syntax node for the member’s alias, if provided (e.g., "alias" in "import module as alias"). */
  aliasNode: Parser.SyntaxNode | undefined;

  /** Indicates if this is a wildcard import (`from module import *`). */
  isWildcardImport: boolean;

  /**
   * The list of explicitly imported items from this member.
   * - Undefined if the import is a wildcard import (`from module import *`).
   * - Undefined if the import is a standard import statement (`import module`).
   */
  items?: ImportItem[];
}

export const NORMAL_IMPORT_STATEMENT_TYPE = "normal";
export const FROM_IMPORT_STATEMENT_TYPE = "from";

export type PythonImportStatementType =
  | typeof NORMAL_IMPORT_STATEMENT_TYPE
  | typeof FROM_IMPORT_STATEMENT_TYPE;

/**
 * Represents a fully resolved import statement from a Python source file.
 * It abstracts both normal (`import module`) and from-import (`from module import X`) statements.
 */
export interface ImportStatement {
  /** The syntax node representing the entire import statement. */
  node: Parser.SyntaxNode;

  /** The type of import statement: either "normal" or "from". */
  type: PythonImportStatementType;

  /**
   * The syntax node representing the source module in a from-import statement (`from module import ...`).
   * - Undefined for standard import statements (`import module`).
   */
  sourceNode: Parser.SyntaxNode | undefined;

  /** The list of imported members or modules. */
  members: ImportMember[];
}

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
 */
export class PythonImportExtractor {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private parser: Parser;
  private normalImportQuery: Parser.Query;
  private fromImportQuery: Parser.Query;
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
    this.normalImportQuery = new Parser.Query(
      this.parser.getLanguage(),
      `(import_statement) @importStmt`,
    );
    this.fromImportQuery = new Parser.Query(
      this.parser.getLanguage(),
      `(import_from_statement) @importStmt`,
    );

    // TODO for later, we need to optimize this by using a simple "bulk query"
    // Something like below:
    // [
    //   (import_statement
    //     name: [
    //       (dotted_name) @module
    //       (aliased_import
    //         name: (dotted_name) @module_alias_name
    //         alias: (identifier) @module_alias
    //       )
    //     ] @member
    //   ) @normal_import

    //   (import_from_statement
    //     module_name: [
    //       (dotted_name) @from_module
    //       (relative_import) @relative_import
    //     ]
    //     name: [
    //       (aliased_import
    //         name: (dotted_name) @imported_symbol
    //         alias: (identifier)? @imported_alias
    //       )
    //       (dotted_name) @imported_symbol
    //     ]? @member
    //     (wildcard_import)? @wildcard_import
    //   ) @from_import
    // ]
  }

  /**
   * Extracts standard import statements (`import module`, `import module as alias`) from the given file.
   *
   * @param filePath - Path to the Python file to analyze.
   * @returns An array of resolved ImportStatement objects representing normal imports.
   */
  private getNormalImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error(`File ${filePath} not found in files map`);
      return [];
    }

    const importStatements: ImportStatement[] = [];

    // Process each matched import statement
    this.normalImportQuery.captures(file.rootNode).forEach(({ node }) => {
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

      importStatements.push(importStatement);
    });

    return importStatements;
  }

  /**
   * Extracts from-import statements (`from module import X`, `from module import *`) from the given file.
   *
   * @param filePath - Path to the Python file to analyze.
   * @returns An array of resolved ImportStatement objects representing from-import statements.
   */
  private getFromImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error(`File ${filePath} not found in files map`);
      return [];
    }

    const importStatements: ImportStatement[] = [];

    // Process each matched from-import statement
    this.fromImportQuery.captures(file.rootNode).forEach(({ node }) => {
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
      importStatements.push(importStatement);
    });

    return importStatements;
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

    const importStatements = [
      ...this.getNormalImportStatements(filePath),
      ...this.getFromImportStatements(filePath),
    ];

    this.cache.set(filePath, importStatements);
    return importStatements;
  }
}
