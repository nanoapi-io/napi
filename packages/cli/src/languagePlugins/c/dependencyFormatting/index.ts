import {
  C_DEP_FUNCTION_TYPE,
  CDependency,
  CDepFile,
  CDepSymbol,
  CDepSymbolType,
} from "./types.js";
import { CSymbolRegistry } from "../symbolRegistry/index.js";
import { CIncludeResolver } from "../includeResolver/index.js";
import { CInvocationResolver } from "../invocationResolver/index.js";
import { CFile, Symbol } from "../symbolRegistry/types.js";
import { Invocations } from "../invocationResolver/types.js";
import Parser from "tree-sitter";
import { C_VARIABLE_TYPE, SymbolType } from "../headerResolver/types.js";

export class CDependencyFormatter {
  symbolRegistry: CSymbolRegistry;
  includeResolver: CIncludeResolver;
  invocationResolver: CInvocationResolver;
  #registry: Map<string, CFile>;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.symbolRegistry = new CSymbolRegistry(files);
    this.#registry = this.symbolRegistry.getRegistry();
    this.includeResolver = new CIncludeResolver(this.symbolRegistry);
    this.invocationResolver = new CInvocationResolver(this.includeResolver);
  }

  #formatSymbolType(st: SymbolType): CDepSymbolType {
    if (["struct", "enum", "union", "typedef", "variable"].includes(st)) {
      return st as CDepSymbolType;
    }
    if (
      ["function_signature", "function_definition", "macro_function"].includes(
        st,
      )
    ) {
      return C_DEP_FUNCTION_TYPE;
    }
    if (st === "macro_constant") {
      return C_VARIABLE_TYPE as CDepSymbolType;
    }
  }

  /**
   * Formats the dependencies of a file.
   * @param fileDependencies - The dependencies of the file.
   * @returns A formatted record of dependencies.
   */
  #formatDependencies(
    fileDependencies: Invocations,
  ): Record<string, CDependency> {
    const dependencies: Record<string, CDependency> = {};
    const resolved = fileDependencies.resolved;
    for (const [symName, symbol] of resolved) {
      const filepath = symbol.declaration.filepath;
      const id = symName;
      if (!dependencies[filepath]) {
        dependencies[filepath] = {
          id: filepath,
          isExternal: false,
          symbols: {},
        };
      }
      dependencies[filepath].symbols[id] = id;
      // if (symbol instanceof Function) {
      //   const defpath = symbol.definitionPath;
      //   if (!dependencies[defpath]) {
      //     dependencies[defpath] = {
      //       id: defpath,
      //       isExternal: false,
      //       symbols: {},
      //     };
      //   }
      //   dependencies[defpath].symbols[id] = id;
      // }
    }
    return dependencies;
  }

  #formatStandardIncludes(stdincludes: string[]): Record<string, CDependency> {
    const dependencies: Record<string, CDependency> = {};
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
  #formatSymbols(fileSymbols: Map<string, Symbol>): Record<string, CDepSymbol> {
    const symbols: Record<string, CDepSymbol> = {};
    for (const [symName, symbol] of fileSymbols) {
      const id = symName;
      const dependencies =
        this.invocationResolver.getInvocationsForSymbol(symbol);
      if (!symbols[id]) {
        symbols[id] = {
          id: id,
          type: this.#formatSymbolType(symbol.declaration.type),
          lineCount:
            symbol.declaration.node.endPosition.row -
            symbol.declaration.node.startPosition.row,
          characterCount:
            symbol.declaration.node.endIndex -
            symbol.declaration.node.startIndex,
          node: symbol.declaration.node,
          dependents: {},
          dependencies: this.#formatDependencies(dependencies),
        };
      }
    }
    return symbols;
  }

  formatFile(filepath: string): CDepFile {
    const file = this.#registry.get(filepath);
    if (!file) {
      throw new Error(`File not found: ${filepath}`);
    }
    const fileSymbols = file.symbols;
    const fileDependencies =
      this.invocationResolver.getInvocationsForFile(filepath);
    const includes = this.includeResolver.getInclusions().get(filepath);
    const stdincludes = Array.from(includes.standard.keys());
    const invokedDependencies = this.#formatDependencies(fileDependencies);
    const stdDependencies = this.#formatStandardIncludes(stdincludes);
    const allDependencies = {
      ...invokedDependencies,
      ...stdDependencies,
    };
    const formattedFile: CDepFile = {
      id: filepath,
      filePath: file.file.path,
      rootNode: file.file.rootNode,
      lineCount: file.file.rootNode.endPosition.row,
      characterCount: file.file.rootNode.endIndex,
      dependencies: allDependencies,
      symbols: this.#formatSymbols(fileSymbols),
    };
    return formattedFile;
  }
}
