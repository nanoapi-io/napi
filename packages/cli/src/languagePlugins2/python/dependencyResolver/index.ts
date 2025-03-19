import Parser from "tree-sitter";
import { PythonModuleMapper } from "../moduleMapper";
import { PythonExportResolver } from "../exportResolver";
import {
  ImportStatement,
  ImportStatementModule,
  PythonImportResolver,
} from "../importResolver";

export interface FileDependency {
  id: string;
  isExternal: boolean;
  isExplicit: boolean;
  isUsed: boolean;
  symbols: Map<string, { id: string; isUsed: boolean; isExplicit: boolean }>;
}

export interface SymbolDependency {
  id: string;
  isExternal: boolean;
  symbolIds: Map<string, string>;
}

export interface FileDependencyManifesto {
  filePath: string;
  fileDependencies: Map<string, FileDependency>;
  symbols: {
    id: string;
    type: string;
    symbolDependencies: Map<string, SymbolDependency>;
  }[];
}

export type ProjectDependencyManifesto = Map<string, FileDependencyManifesto>;

export class PythonDependencyResolver {
  private parser: Parser;
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private moduleMapper: PythonModuleMapper;
  private exportResolver: PythonExportResolver;
  private importResolver: PythonImportResolver;

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    moduleMapper: PythonModuleMapper,
    exportResolver: PythonExportResolver,
    importResolver: PythonImportResolver,
  ) {
    this.parser = parser;
    this.files = files;
    this.moduleMapper = moduleMapper;
    this.exportResolver = exportResolver;
    this.importResolver = importResolver;
  }

  private isUsedInTargetNode(
    targetNode: Parser.SyntaxNode,
    importStatements: ImportStatement[],
    lookupValue: {
      moduleName?: string; // e.g., "utils" or "apps.utils"
      symbolName?: string; // e.g., "MyClass" or "my_function"
    },
  ) {
    if (!lookupValue.moduleName && !lookupValue.symbolName) {
      throw new Error(
        "Invalid lookup value. Need at least one of moduleName or symbolName.",
      );
    }

    let query: Parser.Query;
    if (lookupValue.moduleName && lookupValue.symbolName) {
      query = new Parser.Query(
        this.parser.getLanguage(),
        `
        (attribute) @attr (#eq? @attr "${lookupValue.moduleName}.${lookupValue.symbolName}")
      `,
      );
    } else {
      if (lookupValue.moduleName) {
        const modulePart = lookupValue.moduleName.split(".");
        if (modulePart.length > 1) {
          query = new Parser.Query(
            this.parser.getLanguage(),
            `
            (attribute) @attr (#eq? @attr "${lookupValue.moduleName}")
          `,
          );
        } else {
          query = new Parser.Query(
            this.parser.getLanguage(),
            `
            (identifier) @identifier (#eq? @identifier "${lookupValue.moduleName}")
          `,
          );
        }
      } else {
        query = new Parser.Query(
          this.parser.getLanguage(),
          `
          (identifier) @identifier (#eq? @identifier "${lookupValue.symbolName}")
        `,
        );
      }
    }

    const capture = query.captures(targetNode);
    capture.forEach(({ node }) => {
      let presentOutsideOfImports = false;
      importStatements.forEach((importStatement) => {
        if (
          // Check if the node is outside of the import statement
          node.startIndex > importStatement.node.startIndex &&
          node.endIndex < importStatement.node.endIndex
        ) {
          presentOutsideOfImports = true;
        }
      });

      if (presentOutsideOfImports) {
        return true;
      }
    });

    return false;
  }

  private updateFromImportStatementModule(
    fileDependencies: Map<string, FileDependency>,
    file: { path: string; rootNode: Parser.SyntaxNode },
    importStatements: ImportStatement[],
    importStatementModule: ImportStatementModule,
  ) {
    const isExternal = importStatementModule.module === undefined;
    const isFileModule = importStatementModule.module?.filePath !== undefined;
    // TODO if it is internal module and not a filModule, we need to check for usage of sub modules and their symbol recursively!
    // And add the symbol or module used
    // I think we can look using tree sitter query for a match and check if parent is also atribute and match the submodule or symbol.
    // eg: we match on module, parent is module.submodule, parent is module.submodule.symbol -> we can add symbol as a dependency symbol

    const depId =
      importStatementModule.module?.filePath || importStatementModule.source;

    let fileDependency = fileDependencies.get(depId);
    if (!fileDependency) {
      fileDependency = {
        id: depId,
        isExternal: isExternal,
        isExplicit: importStatementModule.isExplicitelyImported,
        isUsed: false,
        symbols: new Map(),
      };
    }

    let isUsedInFile = false;

    if (importStatementModule.symbols.length > 0) {
      importStatementModule.symbols.forEach((symbol) => {
        const lookupSymbolRef = symbol.alias || symbol.id;
        let lookupValue = { symbolName: undefined, moduleName: undefined } as {
          symbolName?: string;
          moduleName?: string;
        };
        if (symbol.isExplicitelyImported) {
          lookupValue = { symbolName: lookupSymbolRef };
        } else {
          lookupValue = {
            moduleName:
              importStatementModule.alias || importStatementModule.source,
            symbolName: lookupSymbolRef,
          };
        }
        const isUsed = this.isUsedInTargetNode(
          file.rootNode,
          importStatements,
          lookupValue,
        );

        // Update isUsedInFile if needed
        isUsedInFile = isUsedInFile || isUsed;

        const symbolDependency = fileDependency.symbols.get(symbol.id);
        if (!symbolDependency) {
          // Add the symbol to the file dependency
          fileDependency.symbols.set(symbol.id, {
            id: symbol.id,
            isUsed,
            isExplicit: symbol.isExplicitelyImported,
          });
        } else {
          // Update isUsed if needed
          fileDependency.symbols.set(symbol.id, {
            ...symbolDependency,
            isUsed: symbolDependency.isUsed || isUsed,
          });
        }
      });
    } else {
      const lookupModuleRef =
        importStatementModule.alias || importStatementModule.source;
      isUsedInFile = this.isUsedInTargetNode(file.rootNode, importStatements, {
        moduleName: lookupModuleRef,
      });
    }

    fileDependencies.set(depId, {
      ...fileDependency,
      isUsed: fileDependency.isUsed || isUsedInFile,
    });

    return fileDependencies;
  }

  private getFileDependencies(
    file: { path: string; rootNode: Parser.SyntaxNode },
    importStatements: ImportStatement[],
  ): Map<string, FileDependency> {
    let fileDependencies = new Map<string, FileDependency>();

    importStatements.forEach((importStatement) => {
      importStatement.modules.forEach((importStatementModule) => {
        fileDependencies = this.updateFromImportStatementModule(
          fileDependencies,
          file,
          importStatements,
          importStatementModule,
        );
      });
    });

    return fileDependencies;
  }

  private getSymbolDependencies(
    symbolNode: Parser.SyntaxNode,
    importStatements: ImportStatement[],
  ) {
    const symbolDependencies = new Map<string, SymbolDependency>();

    // TODO: Implement the function to populate the symbolDependencies map

    return symbolDependencies;
  }

  public getDependenciesForFile(filePath: string) {
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    const exportedSymbols = this.exportResolver.getSymbols(filePath);
    const importedStatements =
      this.importResolver.getImportStatements(filePath);

    const fileDependencyManifesto: FileDependencyManifesto = {
      filePath,
      fileDependencies: new Map<string, FileDependency>(),
      symbols: [],
    };

    const fileDependencies = this.getFileDependencies(file, importedStatements);

    fileDependencyManifesto.fileDependencies = fileDependencies;

    exportedSymbols.forEach((symbol) => {
      const symbolDependencies = this.getSymbolDependencies(
        symbol.node,
        importedStatements,
      );

      fileDependencyManifesto.symbols.push({
        id: symbol.id,
        type: symbol.type,
        symbolDependencies,
      });
    });

    return fileDependencyManifesto;
  }
}
