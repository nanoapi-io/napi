import Parser from "tree-sitter";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonExportResolver } from "../exportResolver";
import { ImportedModule, PythonImportResolver } from "../importResolver";

export interface Dependency {
  source: string;
  isExternal: boolean;
  isUsed: boolean;
  symbols: { id: string; isUsed: boolean }[];
}

export interface FileDependencies {
  dependencies: Map<string, Dependency>;
  symbols: {
    id: string;
    type: string;
    dependencies: Map<string, Dependency>;
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

  private getDependenciesForNode(
    targetNode: Parser.SyntaxNode,
    importedModules: ImportedModule[],
    importRanges: { start: number; end: number }[],
  ) {
    const dependencies = new Map<string, Dependency>();

    importedModules.forEach((importedModule) => {
      // add to dependencies
      const key = importedModule.resolvedSource || importedModule.source;
      if (!dependencies.has(key)) {
        dependencies.set(key, {
          source: importedModule.source,
          isExternal: importedModule.resolvedSource ? true : false,
          isUsed: false,
          symbols: [],
        });
      }

      // Check all symbls first
      if (importedModule.symbols) {
        importedModule.symbols.forEach((symbol) => {
          const lookupString = symbol.alias || symbol.id;

          const query = new Parser.Query(
            this.parser.getLanguage(),
            `
            (identifier) @identifier (#eq? @identifier "${lookupString}")
            `,
          );

          const captures = query.captures(targetNode);
          let match = false;
          captures.forEach(({ node }) => {
            // Check if the node is within the import range
            if (this.isInsideImportRange(node, importRanges)) {
              match = true;
              return;
            }
          });
          // Add to dependencies
          const dependency = dependencies.get(key);
          if (dependency && match) {
            dependency.isUsed = true;
            dependency.symbols.push({
              id: symbol.id,
              isUsed: true,
            });
          }
        });

        return;
      }

      // Check for module usage
      const lookupString = importedModule.alias || importedModule.source;

      const query = new Parser.Query(
        this.parser.getLanguage(),
        `
        (identifier) @identifier (#eq? @identifier "${lookupString}")
        `,
      );

      const captures = query.captures(targetNode);
      captures.forEach(({ node }) => {
        if (this.isInsideImportRange(node, importRanges)) {
          // Add to dependencies
          const key = importedModule.resolvedSource || importedModule.source;

          const dependency = dependencies.get(key);
          if (dependency) {
            dependency.isUsed = true;
          }
          return;
        }
      });
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
      dependencies: new Map<string, Dependency>(),
      symbols: [],
    };

    fileDependencies.dependencies = this.getDependenciesForNode(
      this.file.rootNode,
      importedModules || [],
      importRanges,
    );

    exportedSymbols.forEach((symbol) => {
      const dependencies = this.getDependenciesForNode(
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
