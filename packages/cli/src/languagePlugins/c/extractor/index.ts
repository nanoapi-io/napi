import type { DependencyManifest } from "@napi/shared";
import { CSymbolRegistry } from "../symbolRegistry/index.ts";
import { CIncludeResolver } from "../includeResolver/index.ts";
import type Parser from "npm:tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";
import type { CFile, Symbol } from "../symbolRegistry/types.ts";
import type { ExportedFile } from "./types.ts";
import { C_DECLARATION_QUERY } from "../headerResolver/queries.ts";
import { C_IFDEF_QUERY } from "./queries.ts";

export class CExtractor {
  manifest: DependencyManifest;
  registry: Map<string, CFile>;
  includeResolver: CIncludeResolver;

  constructor(
    files: Map<string, { path: string; content: string }>,
    manifest: DependencyManifest,
  ) {
    this.manifest = manifest;
    const parsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    for (const [filePath, file] of files) {
      parsedFiles.set(filePath, {
        path: file.path,
        rootNode: cParser.parse(file.content).rootNode,
      });
    }
    const symbolRegistry = new CSymbolRegistry(parsedFiles);
    this.registry = symbolRegistry.getRegistry();
    this.includeResolver = new CIncludeResolver(symbolRegistry);
  }

  /**
   * Finds the first-level dependencies of a symbol in the manifest.
   * @param symbol - The symbol to find dependencies for.
   * @returns An array of symbols that are dependencies of the given symbol.
   */
  #findDependencies(symbol: Symbol): Symbol[] {
    const dependencies: Symbol[] = [symbol];
    const symbolDependencies = this.manifest[symbol.declaration.filepath]
      ?.symbols[symbol.name].dependencies;
    for (
      const [filepath, dependencyinfo] of Object.entries(symbolDependencies)
    ) {
      const dependencyFile = this.registry.get(filepath);
      if (dependencyFile) {
        for (const symbolName of Object.keys(dependencyinfo.symbols)) {
          const dependencySymbol = dependencyFile.symbols.get(symbolName);
          if (dependencySymbol) {
            dependencies.push(dependencySymbol);
          }
        }
      }
    }
    return dependencies;
  }

  /**
   * Finds all dependencies of a given symbol.
   * @param symbol - The symbol for which to find dependencies.
   * @returns An array of symbols.
   */
  #findAllDependencies(symbol: Symbol): Symbol[] {
    const dependencies: Symbol[] = [];
    const visited = new Set<Symbol>();
    const stack = [symbol];

    while (stack.length > 0) {
      const currentSymbol = stack.pop()!;
      if (visited.has(currentSymbol)) {
        continue;
      }
      visited.add(currentSymbol);
      dependencies.push(currentSymbol);
      const currentDependencies = this.#findDependencies(currentSymbol);
      stack.push(...currentDependencies);
    }
    return dependencies;
  }

  /**
   * Build a map of files and their symbols to keep.
   * @param symbolsToKeep - The symbols to keep.
   * @returns A map of file paths to their corresponding ExportedFile objects.
   */
  #buildFileMap(symbolsToKeep: Symbol[]): Map<string, ExportedFile> {
    const exportedFiles = new Map<string, ExportedFile>();
    for (const symbol of symbolsToKeep) {
      const filepath = symbol.declaration.filepath;
      if (!exportedFiles.has(filepath)) {
        const fileInRegistry = this.registry.get(filepath);
        if (!fileInRegistry) {
          throw new Error(`File not found: ${filepath}`);
        }
        const originalFile = fileInRegistry.file;
        // Ifdefs are instances of things that aren't symbols yet invoke a symbol
        const ifdefs = C_IFDEF_QUERY.captures(originalFile.rootNode).map((n) =>
          n.node.text
        );
        const definesToKeep = ifdefs.map((i) => fileInRegistry.symbols.get(i)!);
        const symbols = new Map<string, Symbol>();
        for (const define of definesToKeep) {
          symbols.set(define.name, define);
        }
        exportedFiles.set(filepath, {
          symbols,
          originalFile,
          strippedFile: originalFile,
        });
      }
      const exportedFile = exportedFiles.get(filepath)!;
      const symbolName = symbol.name;
      if (!exportedFile.symbols.has(symbolName)) {
        exportedFile.symbols.set(symbolName, symbol);
      }
    }
    return exportedFiles;
  }

  /**
   * Edits the files to include only the symbols that are needed.
   * @param files - The files to edit.
   */
  #stripFiles(files: Map<string, ExportedFile>) {
    for (const [, file] of files) {
      const rootNode = file.originalFile.rootNode;
      const matches = C_DECLARATION_QUERY.captures(rootNode);
      const symbolsToKeep = new Set(
        file.symbols.values().map((s) => s.declaration.node),
      );
      const symbolsToRemove = new Set<Parser.SyntaxNode>();
      for (const match of matches) {
        const symbolNode = match.node;
        if (!symbolsToKeep.has(symbolNode)) {
          symbolsToRemove.add(symbolNode);
        }
      }
      let filetext = rootNode.text;
      for (const symbolNode of symbolsToRemove) {
        const symbolText = symbolNode.text;
        filetext = filetext.replace(symbolText, "");
      }
      const strippedFile = cParser.parse(filetext);
      file.strippedFile = {
        path: file.originalFile.path,
        rootNode: strippedFile.rootNode,
      };
    }
  }

  /**
   * Finds the dependencies for a map of symbols.
   * @param symbolsMap - A map of file paths to their corresponding symbols.
   * @returns A set of symbols that are dependencies of the given symbols.
   */
  #findDependenciesForMap(
    symbolsMap: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ): Symbol[] {
    const symbolsToExtract: Symbol[] = [];
    for (const [filePath, symbolInfo] of symbolsMap) {
      const file = this.registry.get(filePath);
      if (!file) {
        throw new Error(`File not found: ${filePath}`);
      }
      const symbols = Array.from(symbolInfo.symbols);
      for (const symbolName of symbols) {
        const symbol = file.symbols.get(symbolName);
        if (symbol) {
          const dependencies = this.#findAllDependencies(symbol);
          symbolsToExtract.push(...dependencies);
        }
      }
    }
    // Remove duplicates
    return Array.from(new Set(symbolsToExtract));
  }

  extractSymbols(
    symbolsMap: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ): Map<string, { path: string; content: string }> {
    const symbolsToExtract = this.#findDependenciesForMap(symbolsMap);
    const filesToExport = this.#buildFileMap(symbolsToExtract);
    this.#stripFiles(filesToExport);
    const exportedFiles = new Map<string, { path: string; content: string }>();
    for (const [filePath, file] of filesToExport) {
      const content = file.strippedFile.rootNode.text;
      exportedFiles.set(filePath, {
        path: filePath,
        content,
      });
    }
    return exportedFiles;
  }
}
