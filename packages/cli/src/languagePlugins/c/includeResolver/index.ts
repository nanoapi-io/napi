import { Inclusions } from "./types.js";
import { C_INCLUDE_QUERY, C_STANDARD_INCLUDE_QUERY } from "./queries.js";
import { CSymbolRegistry } from "../symbolRegistry/index.js";
import Parser from "tree-sitter";
import { CFile } from "../symbolRegistry/types.js";

export class CIncludeResolver {
  symbolRegistry: Map<string, CFile>;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #inclusions: Map<string, Inclusions>;

  constructor(symbolRegistry: CSymbolRegistry) {
    this.symbolRegistry = symbolRegistry.getRegistry();
    this.files = symbolRegistry.files;
    this.#inclusions = undefined;
  }

  #getFile(filepath: string): CFile | undefined {
    const filepaths = Array.from(this.symbolRegistry.keys());
    const corresponding = filepaths.find((f) => f.endsWith(filepath));
    if (corresponding) {
      return this.symbolRegistry.get(corresponding);
    }
    return undefined;
  }

  /**
   * Resolves the inclusions of a file.
   * @param file The file to resolve inclusions for.
   * @returns The inclusions of the file.
   */
  #resolveInclusions(file: {
    path: string;
    rootNode: Parser.SyntaxNode;
  }): Inclusions {
    const inclusions: Inclusions = {
      filepath: file.path,
      symbols: new Map(),
      internal: [],
      standard: [],
    };

    const includeNodes = C_INCLUDE_QUERY.captures(file.rootNode);
    const standardIncludeNodes = C_STANDARD_INCLUDE_QUERY.captures(
      file.rootNode,
    );

    for (const node of includeNodes) {
      const path = node.node.text;
      inclusions.internal.push(path);
      const file = this.#getFile(path);
      if (file) {
        for (const [name, symbol] of file.symbols) {
          if (
            symbol.declaration.specifiers.filter((s) =>
              ["auto", "register", "static"].includes(s),
            ).length === 0
          ) {
            inclusions.symbols.set(name, symbol);
          }
        }
      }
    }

    for (const node of standardIncludeNodes) {
      inclusions.standard.push(node.node);
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
