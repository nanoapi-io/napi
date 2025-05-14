import type { Inclusions } from "./types.ts";
import { C_INCLUDE_QUERY, C_STANDARD_INCLUDE_QUERY } from "./queries.ts";
import type { CSymbolRegistry } from "../symbolRegistry/index.ts";
import type Parser from "tree-sitter";
import type { CFile } from "../symbolRegistry/types.ts";
import path from "node:path";

export class CIncludeResolver {
  symbolRegistry: Map<string, CFile>;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #inclusions: Map<string, Inclusions>;

  constructor(symbolRegistry: CSymbolRegistry) {
    this.symbolRegistry = symbolRegistry.getRegistry();
    this.files = symbolRegistry.files;
    this.#inclusions = new Map();
  }

  #getFile(filepath: string, sourcepath: string): CFile | undefined {
    const filepaths = Array.from(this.symbolRegistry.keys());
    // 1. Check current file's directory
    const sourceDir = path.dirname(sourcepath);
    const pathfromrelative = path.join(sourceDir, filepath);
    const corresponding1 = filepaths.find((f) => f === pathfromrelative);
    if (corresponding1) {
      return this.symbolRegistry.get(corresponding1);
    }
    // 2. Check from workspace root
    const corresponding2 = filepaths.find((f) => f === filepath);
    if (corresponding2) {
      return this.symbolRegistry.get(corresponding2);
    }
    // 3. Check wherever
    const corresponding3 = filepaths.find((f) => f.endsWith(filepath));
    if (corresponding3) {
      return this.symbolRegistry.get(corresponding3);
    }
    return undefined;
  }

  /**
   * Resolves the inclusions of a file.
   * @param file The file to resolve inclusions for.
   * @returns The inclusions of the file.
   */
  #resolveInclusions(
    file: { path: string; rootNode: Parser.SyntaxNode },
    visitedFiles = new Set<string>(),
  ): Inclusions {
    const inclusions: Inclusions = {
      filepath: file.path,
      symbols: new Map(),
      internal: [],
      standard: new Map(),
    };

    // Add the current file to the visited set to prevent infinite recursion
    visitedFiles.add(file.path);

    const includeNodes = C_INCLUDE_QUERY.captures(file.rootNode);
    const standardIncludeNodes = C_STANDARD_INCLUDE_QUERY.captures(
      file.rootNode,
    );

    for (const node of includeNodes) {
      const path = node.node.text;
      inclusions.internal.push(path);
      const includedfile = this.#getFile(path, file.path);
      if (includedfile && !visitedFiles.has(includedfile.file.path)) {
        // Add the included file's symbols to the current file's symbols
        for (const [name, symbol] of includedfile.symbols) {
          inclusions.symbols.set(name, symbol);
        }
        // Recursively resolve inclusions for the included file
        const nestedInclusions = this.#resolveInclusions(
          includedfile.file,
          visitedFiles,
        );
        for (const [name, symbol] of nestedInclusions.symbols) {
          inclusions.symbols.set(name, symbol);
        }
        inclusions.internal.push(...nestedInclusions.internal);
        for (const node of nestedInclusions.standard) {
          inclusions.standard.set(node[0], node[1]);
        }
      }
    }

    for (const node of standardIncludeNodes) {
      const child = node.node.childForFieldName("path");
      if (child) {
        inclusions.standard.set(child.text, node.node);
      }
    }

    return inclusions;
  }

  /**
   * Retrieves the inclusions of all files and caches the results.
   * @returns A map of file paths to their inclusions.
   */
  getInclusions() {
    if (!this.#inclusions) {
      this.#inclusions = new Map();
      for (const file of this.files.values()) {
        const inclusions = this.#resolveInclusions(file);
        this.#inclusions.set(file.path, inclusions);
      }
    }
    return this.#inclusions;
  }
}
