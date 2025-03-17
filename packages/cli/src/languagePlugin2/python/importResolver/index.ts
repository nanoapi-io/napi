import Parser from "tree-sitter";
import { PythonExportResolver } from "../exportResolver";
import { ModuleNode, PythonModuleMapper } from "../moduleMapper";

export interface ImportStatementMemberSymbol {
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  aliasNode: Parser.SyntaxNode | undefined;
}

/**
 * Each member contains the identifier and the associated syntax nodes.
 */
export interface ImportStatementMember {
  /**
   * The node of the imported member.
   * eg: "module" in "import module"
   * eg: "module" in "from source import module"
   * eg: "module as m" in "import module as m"
   */
  node: Parser.SyntaxNode;
  /**
   * The tree-sitter node corresponding to the member identifier.
   * eg: "module" in "import module"
   * eg: "module" in "from source import module"
   * eg: "module" in "import module as m"
   */
  memberIdentifierNode: Parser.SyntaxNode;
  /**
   * The tree-sitter node corresponding to the alias for the member, if provided.
   * eg: "m" in "import module as m"
   */
  memberAliasNode: Parser.SyntaxNode | undefined;
  memberSymbols: ImportStatementMemberSymbol[];
}

/**
 * The exported symbols from the module.
 */
export interface ImportStatementSymbol {
  /**
   * The identifier of the exported symbol.
   */
  id: string;
  /**
   * The alias for the exported symbol, if provided.
   */
  alias: string | undefined;
  /**
   * Indicates whether the symbol was explicitly imported in the import statement.
   */
  isExplicitelyImported: boolean;
}

/**
 * Each module includes resolution details along with its exported symbols.
 */
export interface ImportStatementModule {
  /**
   * The source module string as it appears in the import statement.
   */
  source: string;
  /**
   * The alias for the module, if provided.
   */
  alias: string | undefined;
  /**
   * The module fromt the PythonModuleMapper that this import statement resolves to.
   * This is undefined if the module was not found in the PythonModuleMapper.
   */
  module: ModuleNode | undefined;
  /**
   * Indicates whether this module was explicitly imported in the import statement.
   */
  isExplicitelyImported: boolean;
  /**
   * The exported symbols from the module.
   */
  symbols: ImportStatementSymbol[];
}

/**
 * Represents a fully resolved import statement in a Python source file.
 * This includes both the raw syntax (tree-sitter nodes) and the resolved
 * information such as module paths, module types, and exported symbols.
 */
export interface ImportStatement {
  /**
   * The tree-sitter node corresponding to the entire import statement.
   */
  node: Parser.SyntaxNode;

  /**
   * The tree-sitter node representing the source module in the import statement.
   * For example, in "from source import module", this node represents "source".
   * For "import module", value is undefined.
   */
  sourceNode: Parser.SyntaxNode | undefined;

  /**
   * An array of members imported via a "from ... import ..." statement.
   * Each member contains the identifier and the associated syntax nodes.
   */
  members: ImportStatementMember[];

  /**
   * An array of resolved modules that are associated with this import statement.
   * Each module includes resolution details along with its exported symbols.
   */
  modules: ImportStatementModule[];
}
export class PythonImportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private moduleMapper: PythonModuleMapper;
  private exportResolver: PythonExportResolver;
  private parser: Parser;
  private cache = new Map<string, ImportStatement[]>();

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
   * Returns the list of resolved import statements for a given file.
   * This implementation currently handles only normal import statements such as:
   *  - import os
   *  - import externalPackage
   *  - import module1, module2
   *  - import module1 as m1, module2 as m2
   *  - import ..module1, .submodule2
   *  - import module1.submodule2
   *
   * @param filePath The path to the file being analyzed.
   * @returns An array of ImportStatement objects.
   */
  private getNormalImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error("File not found in files map");
      return [];
    }
    const importStatements: ImportStatement[] = [];

    const query = new Parser.Query(
      this.parser.getLanguage(),
      `(import_statement) @importStmt`,
    );

    const captures = query.captures(file.rootNode);
    captures.forEach(({ node }) => {
      const importStatement: ImportStatement = {
        node,
        sourceNode: undefined,
        members: [],
        modules: [],
      };

      const memberNodes = node.childrenForFieldName("name");
      memberNodes.forEach((memberNode) => {
        let memberIdentifierNode: Parser.SyntaxNode;
        let memberAliasNode: Parser.SyntaxNode | undefined;
        if (memberNode.type === "aliased_import") {
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

        if (moduleNode && moduleNode.filePath) {
          const exportedSymbols = this.exportResolver.getSymbols(
            moduleNode.filePath,
          );
          const importStatementSymbols: ImportStatementSymbol[] = [];
          exportedSymbols.forEach((symbol) => {
            const importStatementSymbol: ImportStatementSymbol = {
              id: symbol.id,
              alias: undefined,
              isExplicitelyImported: false,
            };
            importStatementSymbols.push(importStatementSymbol);
          });
          module.symbols = importStatementSymbols;
        }

        importStatement.modules.push(module);
      });

      importStatements.push(importStatement);
    });

    return importStatements;
  }

  private getFromImportStatements(filePath: string): ImportStatement[] {
    const file = this.files.get(filePath);
    if (!file) {
      console.error("File not found in files map");
      return [];
    }
    const importStatements: ImportStatement[] = [];

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

      const wildcardNode = node.childForFieldName("wildcard_import");
      if (wildcardNode) {
        // We do nothing, no symbols to import
      } else {
        // TODO put all the rest of the logic in there
        const memberNode = node.childForFieldName("name");
        if (!memberNode) {
          throw new Error("No name node found for from import");
        }
        const memberIdentifierNode = memberNode;
        const memberAliasNode = undefined;

        const importStatementMember: ImportStatementMember = {
          node: memberNode,
          memberIdentifierNode,
          memberAliasNode,
          memberSymbols: [],
        };

        const symbolNodes = node.childrenForFieldName("name");
        symbolNodes.forEach((symbolNode) => {
          const node = symbolNode;

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

          const importStatementMemberSymbol: ImportStatementMemberSymbol = {
            node,
            identifierNode,
            aliasNode,
          };

          importStatementMember.memberSymbols.push(importStatementMemberSymbol);
        });
      }

      // TODO fix all logic below here
      const memberSymbols: ImportStatementMemberSymbol[] = [];

      importStatement.members.push({
        node: memberNode,
        memberIdentifierNode,
        memberAliasNode,
        memberSymbols,
      });

      const sourceModule = this.moduleMapper.resolveImport(
        file.path,
        sourceNode.text,
      );

      if (!sourceModule) {
        // treat it as external module
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
          symbols: [],
        });
      } else {
        importStatement.members.forEach((member) => {
          // Try to resolve each symbol as a module
          if (member.memberSymbols.length === 0) {
            // wildcard import, get all symbols
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
            // explicit import
            member.memberSymbols.forEach((symbol) => {
              const symbolModule = sourceModule.children.get(
                symbol.identifierNode.text,
              );

              const importStatementSymbols: ImportStatementSymbol[] = [];

              if (symbolModule) {
                // If we resolve the module, we add it
                importStatement.modules.push({
                  source: symbol.identifierNode.text,
                  alias: symbol.aliasNode?.text,
                  module: symbolModule,
                  isExplicitelyImported: true,
                  symbols: [],
                });
              } else {
                // If we do not, we treat it as a symbol
                importStatementSymbols.push({
                  id: symbol.identifierNode.text,
                  alias: symbol.aliasNode?.text,
                  isExplicitelyImported: true,
                });
              }

              if (importStatementSymbols.length > 0) {
                importStatement.modules.push({
                  source: sourceNode.text,
                  alias: undefined,
                  module: sourceModule,
                  isExplicitelyImported: false,
                  symbols: importStatementSymbols,
                });
              }
            });
          }
        });
      }

      importStatements.push(importStatement);
    });

    return importStatements;
  }

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

  // Everything below this line is old code.
  // You can use it as inspiration when coming up with a new implementation.

  // private getFromImportModules(filePath: string, fileNode: Parser.SyntaxNode) {
  //   const importedModules: ImportedModule[] = [];

  //   const fromImportQuery = new Parser.Query(
  //     this.parser.getLanguage(),
  //     `
  //     (module
  //       (import_from_statement
  //         module_name: (_)
  //         name: (dotted_name)
  //       ) @node
  //     )
  //     `,
  //   );

  //   const fromImportCaptures = fromImportQuery.captures(fileNode);
  //   fromImportCaptures.forEach(({ node }) => {
  //     const moduleNode = node.childForFieldName("module_name");
  //     const nameNodes = node.childrenForFieldName("name");

  //     if (!moduleNode) {
  //       console.error("No module or name node found for from import");
  //       return;
  //     }

  //     const source = moduleNode.text;
  //     const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
  //       filePath,
  //       source,
  //     );

  //     const symbols: { id: string; alias: string | undefined }[] = [];

  //     nameNodes.forEach((nameNode) => {
  //       const importedName = nameNode.text;
  //       // First, check if the imported name is a module
  //       let importedModulePath: string | undefined = undefined;
  //       if (resolvedSource) {
  //         importedModulePath = this.moduleResolver.getFilePathFromModuleName(
  //           resolvedSource,
  //           importedName,
  //         );

  //         console.log(222, importedName, importedModulePath);
  //       }

  //       if (importedModulePath) {
  //         importedModules.push({
  //           source: importedName,
  //           resolvedSource: importedModulePath,
  //           alias: undefined,
  //           isWildcard: false,
  //         });
  //       } else {
  //         symbols.push({
  //           id: nameNode.text,
  //           alias: undefined,
  //         });
  //       }
  //     });

  //     if (symbols.length > 0) {
  //       importedModules.push({
  //         source,
  //         resolvedSource,
  //         alias: undefined,
  //         isWildcard: false,
  //         symbols,
  //       });
  //     }
  //   });

  //   return importedModules;
  // }

  // private getFromImportWithAliasModules(
  //   filePath: string,
  //   fileNode: Parser.SyntaxNode,
  // ) {
  //   const importedModules: ImportedModule[] = [];

  //   const fromImportWithAliasQuery = new Parser.Query(
  //     this.parser.getLanguage(),
  //     `
  //     (module
  //       (import_from_statement
  //         module_name: (_)
  //         name: (aliased_import
  //           name: (dotted_name)
  //           alias: (identifier)
  //         )
  //       ) @node
  //     )
  //     `,
  //   );

  //   const fromImportWithAliasCaptures =
  //     fromImportWithAliasQuery.captures(fileNode);
  //   fromImportWithAliasCaptures.forEach(({ node }) => {
  //     const moduleNode = node.childForFieldName("module_name");
  //     const aliasedImportNodes = node.childrenForFieldName("name");
  //     if (!moduleNode) {
  //       console.error("No module or aliased import node found for from import");
  //       return;
  //     }

  //     const source = moduleNode.text;
  //     const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
  //       filePath,
  //       source,
  //     );

  //     const symbols: { id: string; alias: string | undefined }[] = [];

  //     aliasedImportNodes.forEach((aliasedImportNode) => {
  //       const nameNode = aliasedImportNode.childForFieldName("name");
  //       if (!nameNode) {
  //         console.error("No name node found for aliased import");
  //         return;
  //       }
  //       const aliasNode = aliasedImportNode.childForFieldName("alias");
  //       if (!aliasNode) {
  //         console.error("No alias node found for aliased import");
  //         return;
  //       }

  //       // First, check if the imported name is a module
  //       let importedModulePath: string | undefined = undefined;
  //       if (resolvedSource) {
  //         importedModulePath = this.moduleResolver.getFilePathFromModuleName(
  //           resolvedSource,
  //           nameNode.text,
  //         );
  //       }

  //       if (importedModulePath) {
  //         importedModules.push({
  //           source: nameNode.text,
  //           resolvedSource: importedModulePath,
  //           alias: aliasNode.text,
  //           isWildcard: false,
  //         });
  //       } else {
  //         symbols.push({
  //           id: nameNode.text,
  //           alias: aliasNode.text,
  //         });
  //       }
  //     });

  //     if (symbols.length > 0) {
  //       importedModules.push({
  //         source,
  //         resolvedSource,
  //         alias: undefined,
  //         isWildcard: false,
  //         symbols,
  //       });
  //     }
  //   });

  //   return importedModules;
  // }

  // private getFromImportWithWildCardModules(
  //   filePath: string,
  //   fileNode: Parser.SyntaxNode,
  // ) {
  //   const importedModules: ImportedModule[] = [];

  //   const fromImportWithWildcardQuery = new Parser.Query(
  //     this.parser.getLanguage(),
  //     `
  //       (module
  //         (import_from_statement
  //           module_name: (_)
  //           (wildcard_import)
  //         ) @node
  //       )
  //     `,
  //   );

  //   const fromImportWithWildcardCaptures =
  //     fromImportWithWildcardQuery.captures(fileNode);

  //   fromImportWithWildcardCaptures.forEach(({ node }) => {
  //     const moduleNode = node.childForFieldName("module_name");
  //     if (!moduleNode) {
  //       console.error("No module node found for from import with wildcard");
  //       return;
  //     }

  //     const source = moduleNode.text;
  //     const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
  //       filePath,
  //       source,
  //     );

  //     let symbols: { id: string; alias: string | undefined }[] | undefined;

  //     if (resolvedSource) {
  //       const exportedSymbols = this.exportResolver.getSymbols(resolvedSource);

  //       const file = this.files.get(resolvedSource);
  //       if (!file) {
  //         console.error("File not found in files map");
  //         return;
  //       }
  //       const resolvedSourceNode = file.rootNode;
  //       const allExportedSymbols =
  //         this.get__all__ExportedSymbols(resolvedSourceNode);

  //       if (allExportedSymbols) {
  //         symbols = exportedSymbols
  //           .filter((symbol) => allExportedSymbols.includes(symbol.id))
  //           .map((symbol) => ({
  //             id: symbol.id,
  //             alias: undefined,
  //           }));
  //       } else {
  //         symbols = exportedSymbols.map((symbol) => ({
  //           id: symbol.id,
  //           alias: undefined,
  //         }));
  //       }
  //     }

  //     importedModules.push({
  //       source,
  //       resolvedSource,
  //       alias: undefined,
  //       isWildcard: true,
  //       symbols,
  //     });
  //   });

  //   return importedModules;
  // }

  // private get__all__ExportedSymbols(fileNode: Parser.SyntaxNode) {
  //   const query = new Parser.Query(
  //     this.parser.getLanguage(),
  //     `
  //       (module
  //         (expression_statement
  //           (assignment
  //             left: ((identifier) @var_name (#eq? @var_name "__all__"))
  //             right: (list
  //               (string
  //                 (string_content) @element
  //               )
  //             )
  //           )
  //         )
  //       )
  //     `,
  //   );

  //   const captures = query
  //     .captures(fileNode)
  //     .filter(({ name }) => name === "element");

  //   if (captures.length === 0) {
  //     // No __all__ found
  //     return undefined;
  //   }

  //   // Return the strings from the list
  //   // Caller will need to filter the export from the list
  //   return captures.map(({ node }) => node.text);
  // }

  // public getImportedModules(filePath: string) {
  //   if (this.getFromImportedModuleCache(filePath)) {
  //     return this.getFromImportedModuleCache(filePath);
  //   }

  //   const file = this.files.get(filePath);
  //   if (!file) {
  //     console.error("File not found in files map");
  //     return [];
  //   }

  //   const fileNode = file.rootNode;

  //   const importedModules = [
  //     ...this.getNormalImportModules(filePath, fileNode),
  //     ...this.getNormalImportWithAliasModules(filePath, fileNode),
  //     ...this.getFromImportModules(filePath, fileNode),
  //     ...this.getFromImportWithAliasModules(filePath, fileNode),
  //     ...this.getFromImportWithWildCardModules(filePath, fileNode),
  //   ];

  //   this.importedModuleCache.set(filePath, importedModules);

  //   return importedModules;
  // }
}
