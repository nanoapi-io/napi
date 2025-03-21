import Parser from "tree-sitter";
import { PythonExportResolver } from "../exportResolver";
import { ModuleNode, PythonModuleMapper } from "../moduleMapper";

/**
 * Represents a symbol within an imported member.
 */
export interface ImportStatementMemberSymbol {
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  aliasNode: Parser.SyntaxNode | undefined;
}

/**
 * Represents a member imported from a module.
 */
export interface ImportStatementMember {
  /**
   * The syntax node of the imported member.
   */
  node: Parser.SyntaxNode;
  /**
   * The node corresponding to the member’s identifier.
   */
  memberIdentifierNode: Parser.SyntaxNode;
  /**
   * The node corresponding to the alias, if one is provided.
   */
  memberAliasNode: Parser.SyntaxNode | undefined;
  /**
   * Any symbols imported from the member (used in from-import statements).
   */
  memberSymbols: ImportStatementMemberSymbol[];
}

/**
 * Represents an exported symbol from a module.
 */
export interface ImportStatementSymbol {
  /**
   * The identifier of the exported symbol.
   */
  id: string;
  /**
   * The alias of the exported symbol, if provided.
   */
  alias: string | undefined;
  /**
   * True if the symbol was explicitly imported.
   */
  isExplicitelyImported: boolean;
}

/**
 * Contains the resolution details for a module imported in a statement.
 */
export interface ImportStatementModule {
  /**
   * The module string as it appears in the import statement.
   */
  source: string;
  /**
   * The alias for the module, if provided.
   */
  alias: string | undefined;
  /**
   * The resolved module node (or undefined if not found).
   */
  module: ModuleNode | undefined;
  /**
   * True if this module was explicitly imported.
   */
  isExplicitelyImported: boolean;
  /**
   * The symbols exported from the module.
   */
  symbols: ImportStatementSymbol[];
}

/**
 * Represents a fully resolved import statement from a Python source file.
 */
export interface ImportStatement {
  /**
   * The syntax node corresponding to the entire import statement.
   */
  node: Parser.SyntaxNode;
  /**
   * The syntax node representing the source module in a from-import.
   * For standard import statements, this is undefined.
   */
  sourceNode: Parser.SyntaxNode | undefined;
  /**
   * The list of members (or module names) imported.
   */
  members: ImportStatementMember[];
  /**
   * The list of resolved modules along with their exported symbols.
   */
  modules: ImportStatementModule[];
}

/**
 * PythonImportResolver is responsible for extracting and resolving import
 * statements from a Python source file. It handles both standard import
 * statements (e.g. "import os") and from-import statements (e.g. "from module import symbol").
 *
 * It uses Tree-sitter to parse the file, a module mapper to resolve module paths,
 * and an export resolver to extract exported symbols.
 */
export class PythonImportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private moduleMapper: PythonModuleMapper;
  private exportResolver: PythonExportResolver;
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
    moduleMapper: PythonModuleMapper,
    exportResolver: PythonExportResolver,
  ) {
    this.parser = parser;
    this.files = files;
    this.moduleMapper = moduleMapper;
    this.exportResolver = exportResolver;
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
        sourceNode: undefined,
        members: [],
        modules: [],
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
          memberIdentifierNode,
          memberAliasNode,
          memberSymbols: [],
        });
      });

      // For each member, resolve the module and get its exported symbols.
      importStatement.members.forEach((member) => {
        const source = member.memberIdentifierNode.text;
        const moduleNode = this.moduleMapper.resolveImport(file.path, source);
        const alias = member.memberAliasNode?.text;

        const module: ImportStatementModule = {
          source,
          alias,
          module: moduleNode,
          isExplicitelyImported: true,
          symbols: [],
        };

        // If the module is resolved, retrieve its exported symbols.
        if (moduleNode && moduleNode.filePath) {
          const exportedSymbols = this.exportResolver.getSymbols(
            moduleNode.filePath,
          );
          const importStatementSymbols: ImportStatementSymbol[] = [];
          exportedSymbols.forEach((symbol) => {
            importStatementSymbols.push({
              id: symbol.id,
              alias: undefined,
              isExplicitelyImported: false,
            });
          });
          module.symbols = importStatementSymbols;
        }

        importStatement.modules.push(module);
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
        sourceNode,
        members: [],
        modules: [],
      };

      // Create a member for the module name.
      const importStatementMember: ImportStatementMember = {
        node: sourceNode,
        memberIdentifierNode: sourceNode,
        memberAliasNode: undefined,
        memberSymbols: [],
      };

      const wildcardNode = node.descendantsOfType("wildcard_import")[0];
      if (wildcardNode) {
        // For wildcard import, add the member without symbols.
        importStatement.members.push(importStatementMember);
      } else {
        // For explicit imports, gather the imported symbols.
        const symbolNodes = node.childrenForFieldName("name");
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
          importStatementMember.memberSymbols.push({
            node: symbolNode,
            identifierNode,
            aliasNode,
          });
        });
        importStatement.members.push(importStatementMember);
      }

      // Resolve the module using the module mapper.
      const sourceModule = this.moduleMapper.resolveImport(
        file.path,
        sourceNode.text,
      );

      if (!sourceModule) {
        // If unresolved, treat it as external.
        const symbols: ImportStatementSymbol[] = [];
        importStatement.members.forEach((member) => {
          member.memberSymbols.forEach((symbol) => {
            symbols.push({
              id: symbol.identifierNode.text,
              alias: symbol.aliasNode?.text,
              isExplicitelyImported: true,
            });
          });
        });
        importStatement.modules.push({
          source: sourceNode.text,
          alias: undefined,
          module: undefined,
          isExplicitelyImported: true,
          symbols,
        });
      } else {
        importStatement.members.forEach((member) => {
          // If there are no explicit symbols, it's a wildcard import.
          if (member.memberSymbols.length === 0) {
            const importStatementSymbols: ImportStatementSymbol[] = [];
            sourceModule.symbols.forEach((symbol) => {
              if (symbol.supportsWildcardImport) {
                importStatementSymbols.push({
                  id: symbol.id,
                  alias: undefined,
                  isExplicitelyImported: false,
                });
              }
            });
            importStatement.modules.push({
              source: sourceNode.text,
              alias: undefined,
              module: sourceModule,
              isExplicitelyImported: true,
              symbols: importStatementSymbols,
            });
          } else {
            // Explicit import: aggregate all imported symbols into one module entry.
            const explicitSymbols: ImportStatementSymbol[] =
              member.memberSymbols.map((symbol) => ({
                id: symbol.identifierNode.text,
                alias: symbol.aliasNode?.text,
                isExplicitelyImported: true,
              }));
            importStatement.modules.push({
              source: sourceNode.text,
              alias: undefined,
              module: sourceModule,
              isExplicitelyImported: true,
              symbols: explicitSymbols,
            });
          }
        });
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
