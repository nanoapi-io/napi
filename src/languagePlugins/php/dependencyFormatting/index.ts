import type { PHPDependency, PHPDepFile, PHPDepSymbol } from "./types.ts";
import type { ExportedSymbol } from "../exportResolver/types.ts";
import { PHPRegistree } from "../registree/index.ts";
import { PHPIncluseResolver } from "../incluseResolver/index.ts";
import { PHPInvocationResolver } from "../invocationResolver/index.ts";
import type { Invocations } from "../invocationResolver/types.ts";
import type Parser from "tree-sitter";
import type { PHPFile } from "../registree/types.ts";
import { phpParser } from "../../../helpers/treeSitter/parsers.ts";

export class PHPDependencyFormatter {
  registree: PHPRegistree;
  incluseResolver: PHPIncluseResolver;
  invocationResolver: PHPInvocationResolver;
  #registry: Map<string, PHPFile>;

  constructor(
    files: Map<string, { path: string; content: string }>,
  ) {
    const parsedFiles: Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }>
      = new Map();
    for (const [k, v] of files) {
      parsedFiles.set(k, {
        path: v.path,
        rootNode: phpParser.parse(v.content).rootNode,
      });
    }
    this.registree = new PHPRegistree(parsedFiles);
    this.#registry = this.registree.registry.files;
    this.incluseResolver = new PHPIncluseResolver(
      this.registree,
    );
    this.invocationResolver = new PHPInvocationResolver(this.incluseResolver);
  }

  /**
   * Formats the dependencies of a file.
   * @param fileDependencies - The dependencies of the file.
   * @returns A formatted record of dependencies.
   */
  #formatDependencies(
    fileDependencies: Invocations,
  ): Record<string, PHPDependency> {
    const dependencies: Record<string, PHPDependency> = {};
    const resolved = fileDependencies.resolved;
    for (const [symName, symbol] of resolved) {
      const filepaths = symbol.map((s) => s.filepath);
      const id = symName;
      for (const filepath of filepaths) {
        if (!dependencies[filepath]) {
          dependencies[filepath] = {
            id: filepath,
            isExternal: false,
            symbols: {},
          };
        }
        dependencies[filepath].symbols[id] = id;
      }
    }
    return dependencies;
  }

  #formatStandardIncludes(
    stdincludes: string[],
  ): Record<string, PHPDependency> {
    const dependencies: Record<string, PHPDependency> = {};
    for (const id of stdincludes) {
      if (!dependencies[id]) {
        dependencies[id] = {
          id: id,
          isExternal: true,
          symbols: {},
        };
      }
    }
    return dependencies;
  }

  /**
   * Formats the symbols of a file.
   * @param fileSymbols - The symbols of the file.
   * @returns A formatted record of symbols.
   */
  #formatSymbols(
    fileSymbols: Map<string, ExportedSymbol[]>,
  ): Record<string, PHPDepSymbol> {
    const symbols: Record<string, PHPDepSymbol> = {};
    for (const [symName, symbol] of fileSymbols) {
      const id = symName;
      const symbolData = symbol[0];
      const lineCount = symbol.map((s) =>
        s.node.endPosition.row - s.node.startPosition.row
      ).reduce((sum, current) => sum + current, 0);
      const characterCount = symbol.map((s) =>
        s.node.endIndex - s.node.startIndex
      ).reduce((sum, current) => sum + current, 0);
      const dependencies = this.invocationResolver.getInvocationsForNode(
        symbolData.node,
        symbolData.filepath,
        symbolData.name,
      );
      if (!symbols[id]) {
        symbols[id] = {
          id: id,
          type: symbolData.type,
          lineCount,
          characterCount,
          node: symbolData.node, // Wonky
          dependents: {},
          dependencies: this.#formatDependencies(dependencies),
        };
      }
    }
    return symbols;
  }

  formatFile(filepath: string): PHPDepFile {
    const file = this.#registry.get(filepath);
    if (!file) {
      throw new Error(`File not found: ${filepath}`);
    }
    const fileSymbols = file.symbols;
    const fileDependencies = this.invocationResolver.getInvocationsForFile(
      filepath,
    );
    const includes = this.incluseResolver.resolveImports(file);
    if (!includes) {
      throw new Error(`File not found: ${filepath}`);
    }
    const stdincludes = Array.from(includes.unresolved.paths);
    const invokedDependencies = this.#formatDependencies(fileDependencies);
    const stdDependencies = this.#formatStandardIncludes(stdincludes);
    const allDependencies = {
      ...invokedDependencies,
      ...stdDependencies,
    };
    const formattedFile: PHPDepFile = {
      id: filepath,
      filePath: file.path,
      rootNode: file.rootNode,
      lineCount: file.rootNode.endPosition.row,
      characterCount: file.rootNode.endIndex,
      dependencies: allDependencies,
      symbols: this.#formatSymbols(fileSymbols),
    };
    return formattedFile;
  }
}
