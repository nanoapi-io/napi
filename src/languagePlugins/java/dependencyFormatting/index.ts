import type Parser from "npm:tree-sitter";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";
import { JavaImportResolver } from "../importResolver/index.ts";
import { JavaInvocationResolver } from "../invocationResolver/index.ts";
import { JavaPackageMapper } from "../packageMapper/index.ts";
import type { JavaDependency, JavaDepFile, JavaDepSymbol } from "./types.ts";
import type { Invocations } from "../invocationResolver/types.ts";
import type { ExportedSymbol } from "../packageResolver/types.ts";

/**
 * Class responsible for formatting Java dependencies by analyzing parsed files,
 * resolving imports, invocations, and symbols.
 */
export class JavaDependencyFormatter {
  mapper: JavaPackageMapper;
  importResolver: JavaImportResolver;
  invocationResolver: JavaInvocationResolver;

  /**
   * Constructs a JavaDependencyFormatter instance.
   *
   * @param files - A map of file identifiers to their path and content.
   */
  constructor(files: Map<string, { path: string; content: string }>) {
    const parsedFiles: Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    > = new Map();
    for (const [k, f] of files) {
      try {
        const rootNode = javaParser.parse(f.content, undefined, {
          bufferSize: f.content.length + 10,
        }).rootNode;
        parsedFiles.set(k, {
          path: f.path,
          rootNode: rootNode,
        });
      } catch (e) {
        console.error(`Failed to parse ${f.path}, skipping`);
        console.error(e);
      }
    }
    this.mapper = new JavaPackageMapper(parsedFiles);
    this.importResolver = new JavaImportResolver(this.mapper);
    this.invocationResolver = new JavaInvocationResolver(this.importResolver);
  }

  /**
   * Formats the dependencies of a file based on its invocations.
   *
   * @param fileDependencies - The invocations of the file to process.
   * @returns A record of Java dependencies.
   */
  #formatDependencies(
    fileDependencies: Invocations,
  ): Record<string, JavaDependency> {
    const dependencies: Record<string, JavaDependency> = {};
    const resolved = fileDependencies.resolved;
    for (const [, node] of resolved) {
      const filepath = node.file.path;
      // Getting the file's symbol to get the oldest ancestor in case of nested symbol
      const id = node.file.symbol.name;
      if (!dependencies[filepath]) {
        dependencies[filepath] = {
          id: filepath,
          isExternal: false,
          symbols: {},
        };
      }
      dependencies[filepath].symbols[id] = id;
    }
    return dependencies;
  }

  /**
   * Formats standard library imports into dependency records.
   *
   * @param stdimports - An array of unresolved standard imports.
   * @returns A record of Java dependencies for standard imports.
   */
  #formatStandardImports(stdimports: string[]): Record<string, JavaDependency> {
    const dependencies: Record<string, JavaDependency> = {};
    for (const id of stdimports) {
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
   * Formats a symbol exported by a file into a dependency symbol record.
   *
   * @param fileSymbol - The exported symbol to format.
   * @returns A record containing the formatted dependency symbol.
   */
  #formatSymbol(fileSymbol: ExportedSymbol): Record<string, JavaDepSymbol> {
    // Record despite files only having 1 symbol since it's needed for manifest
    const symbol: Record<string, JavaDepSymbol> = {};
    const id = fileSymbol.name;
    const dependencies = this.invocationResolver.getInvocations(
      this.mapper.files.get(fileSymbol.filepath)!,
    );
    symbol[id] = {
      id: id,
      type: fileSymbol.type,
      lineCount: fileSymbol.node.endPosition.row -
        fileSymbol.node.startPosition.row,
      characterCount: fileSymbol.node.endIndex -
        fileSymbol.node.startIndex,
      node: fileSymbol.node,
      dependents: {},
      dependencies: this.#formatDependencies(dependencies),
    };
    return symbol;
  }

  /**
   * Formats a file into a JavaDepFile object, including its dependencies and symbols.
   *
   * @param filepath - The path of the file to format.
   * @returns A formatted JavaDepFile object.
   */
  formatFile(filepath: string): JavaDepFile {
    const file = this.mapper.files.get(filepath)!;
    const imports = this.importResolver.imports.get(filepath)!;
    const stdDependencies = this.#formatStandardImports(imports.unresolved);
    const invocations = this.invocationResolver.invocations.get(filepath)!;
    const invokedDependencies = this.#formatDependencies(invocations);
    const allDependencies = {
      ...invokedDependencies,
      ...stdDependencies,
    };
    const formattedFile: JavaDepFile = {
      id: filepath,
      filePath: file.path,
      rootNode: file.rootNode,
      lineCount: file.rootNode.endPosition.row,
      characterCount: file.rootNode.endIndex,
      dependencies: allDependencies,
      symbols: this.#formatSymbol(file.symbol),
    };
    return formattedFile;
  }
}
