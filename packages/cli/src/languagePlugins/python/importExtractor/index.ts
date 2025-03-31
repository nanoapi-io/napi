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

  /** The syntax node corresponding to the member's identifier. */
  identifierNode: Parser.SyntaxNode;

  /** The syntax node for the member's alias, if provided (e.g., "alias" in "import module as alias"). */
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
  private importQuery: Parser.Query;
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
