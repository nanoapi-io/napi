import Parser from "tree-sitter";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonExportResolver } from "../exportResolver";

export interface ImportedModule {
  source: string;
  resolvedSource: string | undefined;
  alias: string | undefined;
  isWildcard: boolean;
  symbols?: {
    id: string;
    alias: string | undefined;
  }[];
}

export class PythonImportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private moduleResolver: PythonModuleResolver;
  private exportResolver: PythonExportResolver;
  private parser: Parser;
  private importedModuleCache = new Map<string, ImportedModule[]>();

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    moduleResolver: PythonModuleResolver,
    exportResolver: PythonExportResolver,
  ) {
    this.parser = parser;
    this.files = files;
    this.moduleResolver = moduleResolver;
    this.exportResolver = exportResolver;
  }

  private getFromImportedModuleCache(cacheKey: string) {
    if (this.importedModuleCache.has(cacheKey)) {
      const cachedValue = this.importedModuleCache.get(cacheKey);
      if (cachedValue) {
        return cachedValue;
      }
    }
    return undefined;
  }

  private getNormalImportModules(
    filePath: string,
    fileNode: Parser.SyntaxNode,
  ) {
    const importedModules: ImportedModule[] = [];

    const importQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (import_statement
            name: (_)
          ) @node
        )
      `,
    );

    const importCaptures = importQuery.captures(fileNode);
    importCaptures.forEach(({ node }) => {
      const moduleNodes = node.children.filter(
        (child) => child.type === "dotted_name",
      );

      moduleNodes.forEach((moduleNode) => {
        const source = moduleNode.text;
        const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
          filePath,
          source,
        );

        importedModules.push({
          source,
          resolvedSource,
          alias: undefined,
          isWildcard: false,
        });
      });
    });

    return importedModules;
  }

  private getNormalImportWithAliasModules(
    filePath: string,
    fileNode: Parser.SyntaxNode,
  ) {
    const importedModules: ImportedModule[] = [];

    const importWithAliasQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (import_statement
            name: (aliased_import
              name: (_)
              alias: (identifier)
            )
          ) @node
        )
      `,
    );

    const importWithAliasCaptures = importWithAliasQuery.captures(fileNode);
    importWithAliasCaptures.forEach(({ node }) => {
      const moduleNodes = node.children.filter(
        (child) => child.type === "aliased_import",
      );

      moduleNodes.forEach((moduleNode) => {
        const identifierNode = moduleNode.childForFieldName("name");
        if (!identifierNode) {
          console.error("No identifier node found for import");
          return;
        }
        const aliasNode = moduleNode.childForFieldName("alias");
        if (!aliasNode) {
          console.error("No alias node found for import");
          return;
        }

        const source = identifierNode.text;

        const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
          filePath,
          source,
        );

        importedModules.push({
          source,
          resolvedSource,
          alias: aliasNode.text,
          isWildcard: false,
        });
      });
    });

    return importedModules;
  }

  private getFromImportModules(filePath: string, fileNode: Parser.SyntaxNode) {
    const importedModules: ImportedModule[] = [];

    const fromImportQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_from_statement
          module_name: (_)
          name: (dotted_name)
        ) @node
      )
      `,
    );

    const fromImportCaptures = fromImportQuery.captures(fileNode);
    fromImportCaptures.forEach(({ node }) => {
      const moduleNode = node.childForFieldName("module_name");
      const nameNodes = node.childrenForFieldName("name");

      if (!moduleNode) {
        console.error("No module or name node found for from import");
        return;
      }

      const source = moduleNode.text;
      const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
        filePath,
        source,
      );

      const symbols: { id: string; alias: string | undefined }[] = [];

      nameNodes.forEach((nameNode) => {
        const importedName = nameNode.text;
        // First, check if the imported name is a module
        let importedModulePath: string | undefined = undefined;
        if (resolvedSource) {
          importedModulePath = this.moduleResolver.getFilePathFromModuleName(
            resolvedSource,
            importedName,
          );

          console.log(222, importedName, importedModulePath);
        }

        if (importedModulePath) {
          importedModules.push({
            source: importedName,
            resolvedSource: importedModulePath,
            alias: undefined,
            isWildcard: false,
          });
        } else {
          symbols.push({
            id: nameNode.text,
            alias: undefined,
          });
        }
      });

      if (symbols.length > 0) {
        importedModules.push({
          source,
          resolvedSource,
          alias: undefined,
          isWildcard: false,
          symbols,
        });
      }
    });

    return importedModules;
  }

  private getFromImportWithAliasModules(
    filePath: string,
    fileNode: Parser.SyntaxNode,
  ) {
    const importedModules: ImportedModule[] = [];

    const fromImportWithAliasQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_from_statement
          module_name: (_)
          name: (aliased_import
            name: (dotted_name)
            alias: (identifier)
          )
        ) @node
      )
      `,
    );

    const fromImportWithAliasCaptures =
      fromImportWithAliasQuery.captures(fileNode);
    fromImportWithAliasCaptures.forEach(({ node }) => {
      const moduleNode = node.childForFieldName("module_name");
      const aliasedImportNodes = node.childrenForFieldName("name");
      if (!moduleNode) {
        console.error("No module or aliased import node found for from import");
        return;
      }

      const source = moduleNode.text;
      const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
        filePath,
        source,
      );

      const symbols: { id: string; alias: string | undefined }[] = [];

      aliasedImportNodes.forEach((aliasedImportNode) => {
        const nameNode = aliasedImportNode.childForFieldName("name");
        if (!nameNode) {
          console.error("No name node found for aliased import");
          return;
        }
        const aliasNode = aliasedImportNode.childForFieldName("alias");
        if (!aliasNode) {
          console.error("No alias node found for aliased import");
          return;
        }

        // First, check if the imported name is a module
        let importedModulePath: string | undefined = undefined;
        if (resolvedSource) {
          importedModulePath = this.moduleResolver.getFilePathFromModuleName(
            resolvedSource,
            nameNode.text,
          );
        }

        if (importedModulePath) {
          importedModules.push({
            source: nameNode.text,
            resolvedSource: importedModulePath,
            alias: aliasNode.text,
            isWildcard: false,
          });
        } else {
          symbols.push({
            id: nameNode.text,
            alias: aliasNode.text,
          });
        }
      });

      if (symbols.length > 0) {
        importedModules.push({
          source,
          resolvedSource,
          alias: undefined,
          isWildcard: false,
          symbols,
        });
      }
    });

    return importedModules;
  }

  private getFromImportWithWildCardModules(
    filePath: string,
    fileNode: Parser.SyntaxNode,
  ) {
    const importedModules: ImportedModule[] = [];

    const fromImportWithWildcardQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (import_from_statement
            module_name: (_)
            (wildcard_import)
          ) @node
        )
      `,
    );

    const fromImportWithWildcardCaptures =
      fromImportWithWildcardQuery.captures(fileNode);

    fromImportWithWildcardCaptures.forEach(({ node }) => {
      const moduleNode = node.childForFieldName("module_name");
      if (!moduleNode) {
        console.error("No module node found for from import with wildcard");
        return;
      }

      const source = moduleNode.text;
      const resolvedSource = this.moduleResolver.getFilePathFromModuleName(
        filePath,
        source,
      );

      let symbols: { id: string; alias: string | undefined }[] | undefined;

      if (resolvedSource) {
        const exportedSymbols = this.exportResolver.getSymbols(resolvedSource);

        const file = this.files.get(resolvedSource);
        if (!file) {
          console.error("File not found in files map");
          return;
        }
        const resolvedSourceNode = file.rootNode;
        const allExportedSymbols =
          this.get__all__ExportedSymbols(resolvedSourceNode);

        if (allExportedSymbols) {
          symbols = exportedSymbols
            .filter((symbol) => allExportedSymbols.includes(symbol.id))
            .map((symbol) => ({
              id: symbol.id,
              alias: undefined,
            }));
        } else {
          symbols = exportedSymbols.map((symbol) => ({
            id: symbol.id,
            alias: undefined,
          }));
        }
      }

      importedModules.push({
        source,
        resolvedSource,
        alias: undefined,
        isWildcard: true,
        symbols,
      });
    });

    return importedModules;
  }

  private get__all__ExportedSymbols(fileNode: Parser.SyntaxNode) {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
        (module
          (expression_statement
            (assignment
              left: ((identifier) @var_name (#eq? @var_name "__all__"))
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

    const captures = query
      .captures(fileNode)
      .filter(({ name }) => name === "element");

    if (captures.length === 0) {
      // No __all__ found
      return undefined;
    }

    // Return the strings from the list
    // Caller will need to filter the export from the list
    return captures.map(({ node }) => node.text);
  }

  public getImportedModules(filePath: string) {
    if (this.getFromImportedModuleCache(filePath)) {
      return this.getFromImportedModuleCache(filePath);
    }

    const file = this.files.get(filePath);
    if (!file) {
      console.error("File not found in files map");
      return [];
    }

    const fileNode = file.rootNode;

    const importedModules = [
      ...this.getNormalImportModules(filePath, fileNode),
      ...this.getNormalImportWithAliasModules(filePath, fileNode),
      ...this.getFromImportModules(filePath, fileNode),
      ...this.getFromImportWithAliasModules(filePath, fileNode),
      ...this.getFromImportWithWildCardModules(filePath, fileNode),
    ];

    this.importedModuleCache.set(filePath, importedModules);

    return importedModules;
  }
}
