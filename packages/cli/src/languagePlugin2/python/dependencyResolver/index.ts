import Parser from "tree-sitter";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonExportResolver } from "../exportResolver";
import { ImportedModule, PythonImportResolver } from "../importResolver";

export interface FileDependency {
  source: string;
  isExternal: boolean;
  isUsed: boolean;
  symbols: { id: string; isUsed: boolean }[];
}

export interface SymbolDependency {
  source: string;
  isExternal: boolean;
  symbolIds: string[];
}

export interface FileDependencies {
  dependencies: Map<string, FileDependency>;
  symbols: {
    id: string;
    type: string;
    dependencies: Map<string, SymbolDependency>;
  }[];
}

export class PythonDependencyResolver {
  private file: { path: string; rootNode: Parser.SyntaxNode };
  private parser: Parser;
  moduleResolver: PythonModuleResolver;
  exportResolver: PythonExportResolver;
  private importResolver: PythonImportResolver;

  constructor(
    file: { path: string; rootNode: Parser.SyntaxNode },
    parser: Parser,
    moduleResolver: PythonModuleResolver,
    exportResolver: PythonExportResolver,
    importResolver: PythonImportResolver,
  ) {
    this.file = file;
    this.parser = parser;
    this.moduleResolver = moduleResolver;
    this.exportResolver = exportResolver;
    this.importResolver = importResolver;
  }

  private getImportRanges() {
    const ranges: { start: number; end: number }[] = [];

    const importQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_statement) @import
      (import_from_statement) @import
      `,
    );

    const importCaptures = importQuery.captures(this.file.rootNode);

    importCaptures.forEach(({ node }) => {
      ranges.push({
        start: node.startIndex,
        end: node.endIndex,
      });
    });

    return ranges;
  }

  private isInsideImportRange(
    node: Parser.SyntaxNode,
    importRanges: { start: number; end: number }[],
  ) {
    return importRanges.some(({ start, end }) => {
      return node.startIndex >= start && node.endIndex <= end;
    });
  }

  private getFileDependencies(
    fileNode: Parser.SyntaxNode,
    importedModules: ImportedModule[],
    importRanges: { start: number; end: number }[],
  ) {
    const dependencies = new Map<string, FileDependency>();

    importedModules.forEach((importedModule) => {
      // add to dependencies
      const key = importedModule.resolvedSource || importedModule.source;
      let dependency = dependencies.get(key);
      if (!dependency) {
        dependency = {
          source: importedModule.resolvedSource || importedModule.source,
          isExternal: importedModule.resolvedSource ? false : true,
          isUsed: false,
          symbols: [],
        };
      }

      // Check all symbols first
      if (importedModule.symbols) {
        importedModule.symbols.forEach((symbol) => {
          console.log(11111, importedModule);
          const lookupString = symbol.alias || symbol.id;

          const query = new Parser.Query(
            this.parser.getLanguage(),
            `
            ((identifier) @identifier (#eq? @identifier "${lookupString}"))
            `,
          );

          const captures = query.captures(fileNode);
          const isUsed = captures.some(({ node }) => {
            return !this.isInsideImportRange(node, importRanges);
          });

          // Add to dependencies
          dependency.symbols.push({
            id: symbol.id,
            isUsed,
          });

          if (isUsed) {
            // Set isUsed to true
            dependency.isUsed = true;
          }
        });
      } else {
        // Check for module usage
        const lookupString = importedModule.alias || importedModule.source;

        const query = new Parser.Query(
          this.parser.getLanguage(),
          `
          ((identifier) @identifier (#eq? @identifier "${lookupString}"))
          `,
        );

        const captures = query.captures(fileNode);
        captures.forEach(({ node }) => {
          if (this.isInsideImportRange(node, importRanges)) {
            // Set isUsed to true
            const dependency = dependencies.get(key);
            if (dependency) {
              dependency.isUsed = true;
            }
            return;
          }
        });
      }

      // Add to dependencies
      dependencies.set(key, dependency);
    });

    return dependencies;
  }

  private getSymbolDependencies(
    symbolNode: Parser.SyntaxNode,
    importedModules: ImportedModule[],
    importRanges: { start: number; end: number }[],
  ) {
    const dependencies = new Map<string, SymbolDependency>();

    importedModules.forEach((importedModule) => {
      // add to dependencies
      const key = importedModule.resolvedSource || importedModule.source;
      let dependency = dependencies.get(key);
      if (!dependency) {
        dependency = {
          source: importedModule.resolvedSource || importedModule.source,
          isExternal: importedModule.resolvedSource ? false : true,
          symbolIds: [],
        };
      }

      let isUsed = false;

      // Check all symbols first
      if (importedModule.symbols) {
        importedModule.symbols.forEach((symbol) => {
          const lookupString = symbol.alias || symbol.id;

          const query = new Parser.Query(
            this.parser.getLanguage(),
            `
            (identifier) @identifier (#eq? @identifier "${lookupString}")
            `,
          );

          const captures = query.captures(symbolNode);
          const symbolIsUsed = captures.some(({ node }) => {
            return !this.isInsideImportRange(node, importRanges);
          });

          if (symbolIsUsed) {
            dependency.symbolIds.push(symbol.id);
            if (!isUsed) {
              isUsed = true;
            }
          }
        });
      } else {
        // Check for module usage
        const lookupString = importedModule.alias || importedModule.source;

        const query = new Parser.Query(
          this.parser.getLanguage(),
          `
          (identifier) @identifier (#eq? @identifier "${lookupString}")
          `,
        );

        const captures = query.captures(symbolNode);
        captures.forEach(({ node }) => {
          if (this.isInsideImportRange(node, importRanges)) {
            if (!isUsed) {
              isUsed = true;
            }
          }
        });
      }

      if (isUsed) {
        // Add to dependencies if it is used
        dependencies.set(key, dependency);
      }
    });

    return dependencies;
  }

  public getDependencies() {
    const exportedSymbols = this.exportResolver.getSymbols(this.file.path);
    const importedModules = this.importResolver.getImportedModules(
      this.file.path,
    );

    const importRanges = this.getImportRanges();

    const fileDependencies: FileDependencies = {
      dependencies: new Map<string, FileDependency>(),
      symbols: [],
    };

    fileDependencies.dependencies = this.getFileDependencies(
      this.file.rootNode,
      importedModules || [],
      importRanges,
    );

    exportedSymbols.forEach((symbol) => {
      const dependencies = this.getSymbolDependencies(
        symbol.node,
        importedModules || [],
        importRanges,
      );

      fileDependencies.symbols.push({
        id: symbol.id,
        type: symbol.type,
        dependencies,
      });
    });

    return fileDependencies;
  }
}
