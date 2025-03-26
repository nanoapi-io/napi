import Parser from "tree-sitter";

/** Represents a symbol within an imported member. */
export interface ExplicitSymbol {
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  aliasNode: Parser.SyntaxNode | undefined;
}

/** Represents a member imported from a module. */
export interface Member {
  /** The syntax node of the imported member. */
  node: Parser.SyntaxNode;
  /** The node corresponding to the member’s identifier. */
  identifierNode: Parser.SyntaxNode;
  /** The node corresponding to the alias, if one is provided. */
  aliasNode: Parser.SyntaxNode | undefined;
  /** if the import is a wildcard import (from module import *) */
  isWildcardImport: boolean;
  /** Any symbols imported from the member (used in from-import statements).
   * undefined if the import is a wildcard import (from module import *)
   * undefined if the import is a standard import (import module) */
  explicitSymbols?: ExplicitSymbol[];
}

export const normalImportStatementType = "normal";
export const fromImportStatementType = "from";

export type ImportStatementType =
  | typeof normalImportStatementType
  | typeof fromImportStatementType;

/** Represents a fully resolved import statement from a Python source file. */
export interface ImportStatement {
  /** The syntax node corresponding to the entire import statement. */
  node: Parser.SyntaxNode;
  /** The type of import statement (normal or from). */
  type: ImportStatementType;
  /** The syntax node representing the source module in a from-import.
   * For standard import statements, this is undefined. */
  sourceNode: Parser.SyntaxNode | undefined;
  /** The list of members (or module names) imported. */
  members: Member[];
}

/**
 * PythonImportResolver is responsible for extracting and resolving import
 * statements from a Python source file. It handles both standard import
 * statements (e.g. "import os") and from-import statements (e.g. "from module import symbol").
 *
 * It uses Tree-sitter to parse the file, a module mapper to resolve module paths,
 * and an export resolver to extract exported symbols.
 */
export class PythonImportExtractor {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private parser: Parser;
  private cache = new Map<string, ImportStatement[]>();

  /**
   * Creates an instance of PythonImportResolver.
   * @param parser - A Tree-sitter parser instance.
   * @param files - A map of file paths to file objects.
   * @param moduleMapper - The module mapper for resolving module paths.
   * @param exportResolver - The export resolver for retrieving exported symbols.
   */
  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.parser = parser;
    this.files = files;
  }

  /**
   * Extracts standard import statements (e.g. "import os", "import sys as system")
   * from the given file.
   *
   * @param filePath - The path of the file to analyze.
   * @returns An array of ImportStatement objects.
   */
  private getNormalImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error("File not found in files map");
      return [];
    }
    const importStatements: ImportStatement[] = [];

    // Query for standard import statements.
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `(import_statement) @importStmt`,
    );

    // Process each captured import_statement node.
    const captures = query.captures(file.rootNode);
    captures.forEach(({ node }) => {
      const importStatement: ImportStatement = {
        node,
        type: normalImportStatementType,
        sourceNode: undefined,
        members: [],
      };

      // Get the member nodes (the names in the import statement).
      const memberNodes = node.childrenForFieldName("name");
      memberNodes.forEach((memberNode) => {
        let memberIdentifierNode: Parser.SyntaxNode;
        let memberAliasNode: Parser.SyntaxNode | undefined;
        if (memberNode.type === "aliased_import") {
          // For aliased imports, get both the identifier and alias.
          const identifierNode = memberNode.childForFieldName("name");
          if (!identifierNode) {
            throw new Error("No name node found for aliased import");
          }
          const aliasNode = memberNode.childForFieldName("alias");
          memberIdentifierNode = identifierNode;
          memberAliasNode = aliasNode || undefined;
        } else {
          memberIdentifierNode = memberNode;
          memberAliasNode = undefined;
        }

        importStatement.members.push({
          node: memberNode,
          identifierNode: memberIdentifierNode,
          aliasNode: memberAliasNode,
          isWildcardImport: false,
          explicitSymbols: undefined,
        });
      });

      importStatements.push(importStatement);
    });

    return importStatements;
  }

  /**
   * Extracts from-import statements (e.g. "from module import symbol") from the given file.
   *
   * @param filePath - The path of the file to analyze.
   * @returns An array of ImportStatement objects.
   */
  private getFromImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error("File not found in files map");
      return [];
    }
    const importStatements: ImportStatement[] = [];

    // Query for from-import statements.
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `(import_from_statement) @importStmt`,
    );

    const captures = query.captures(file.rootNode);
    captures.forEach(({ node }) => {
      const sourceNode = node.childForFieldName("module_name");
      if (!sourceNode) {
        throw new Error("No module name node found for from import");
      }

      const importStatement: ImportStatement = {
        node,
        type: fromImportStatementType,
        sourceNode,
        members: [],
      };

      // Create a member for the module name.
      const importStatementMember: Member = {
        node: sourceNode,
        identifierNode: sourceNode,
        aliasNode: undefined,
        isWildcardImport: false,
        explicitSymbols: undefined,
      };

      const wildcardNode = node.descendantsOfType("wildcard_import")[0];
      if (wildcardNode) {
        importStatementMember.isWildcardImport = true;
        importStatement.members.push(importStatementMember);
      } else {
        // For explicit imports, gather the imported symbols.
        const symbolNodes = node.childrenForFieldName("name");

        const explicitSymbols: ExplicitSymbol[] = [];

        symbolNodes.forEach((symbolNode) => {
          let identifierNode: Parser.SyntaxNode;
          let aliasNode: Parser.SyntaxNode | undefined;
          if (symbolNode.type === "aliased_import") {
            const identifier = symbolNode.childForFieldName("name");
            if (!identifier) {
              throw new Error("No name node found for aliased import");
            }
            identifierNode = identifier;
            aliasNode = symbolNode.childForFieldName("alias") || undefined;
          } else {
            identifierNode = symbolNode;
            aliasNode = undefined;
          }
          explicitSymbols.push({
            node: symbolNode,
            identifierNode,
            aliasNode,
          });
        });

        importStatementMember.explicitSymbols = explicitSymbols;

        importStatement.members.push(importStatementMember);
      }

      importStatements.push(importStatement);
    });

    return importStatements;
  }

  /**
   * Returns all resolved import statements for the given file.
   * This includes both standard import statements and from-import statements.
   * Results are cached for subsequent calls.
   *
   * @param filePath - The path to the file being analyzed.
   * @returns An array of ImportStatement objects.
   */
  public getImportStatements(filePath: string): ImportStatement[] {
    const cacheKey = filePath;
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    const normalImportStatements = this.getNormalImportStatements(filePath);
    const fromImportStatements = this.getFromImportStatements(filePath);

    const importStatements = [
      ...normalImportStatements,
      ...fromImportStatements,
    ];

    this.cache.set(cacheKey, importStatements);

    return importStatements;
  }
}
