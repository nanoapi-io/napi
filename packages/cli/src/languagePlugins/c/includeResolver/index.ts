import type { Inclusions } from "./types.ts";
import { C_INCLUDE_QUERY, C_STANDARD_INCLUDE_QUERY } from "./queries.ts";
import type { CSymbolRegistry } from "../symbolRegistry/index.ts";
import type Parser from "npm:tree-sitter";
import {
  type CFile,
  FunctionDefinition,
  FunctionSignature,
} from "../symbolRegistry/types.ts";
import { dirname, join } from "@std/path";

export class CIncludeResolver {
  symbolRegistry: Map<string, CFile>;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #inclusions?: Map<string, Inclusions>;
  #inclusionCache: Map<CFile, Inclusions>;

  constructor(symbolRegistry: CSymbolRegistry) {
    this.symbolRegistry = symbolRegistry.getRegistry();
    this.files = symbolRegistry.files;
    this.#inclusionCache = new Map();
  }

  #getFile(filepath: string, sourcepath: string): CFile | undefined {
    const filepaths = Array.from(this.symbolRegistry.keys());
    // 1. Check current file's directory
    const sourceDir = dirname(sourcepath);
    const pathfromrelative = join(sourceDir, filepath);
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
    file: CFile,
    visitedFiles = new Set<string>(),
  ): Inclusions {
    const inclusions: Inclusions = {
      filepath: file.file.path,
      symbols: new Map(),
      internal: {
        name: ".",
        children: new Map(),
      },
      standard: new Map(),
    };

    // Add the current file to the visited set to prevent infinite recursion
    visitedFiles.add(file.file.path);

    // Check for file in cache
    if (this.#inclusionCache.has(file)) {
      return this.#inclusionCache.get(file)!;
    }

    const includeNodes = C_INCLUDE_QUERY.captures(file.file.rootNode);
    const standardIncludeNodes = C_STANDARD_INCLUDE_QUERY.captures(
      file.file.rootNode,
    );

    for (const node of includeNodes) {
      const path = node.node.text;
      const includedfile = this.#getFile(path, file.file.path);
      if (includedfile && !visitedFiles.has(includedfile.file.path)) {
        // Add the included file's symbols to the current file's symbols
        for (const [name, symbol] of includedfile.symbols) {
          inclusions.symbols.set(name, symbol);
        }
        // Recursively resolve inclusions for the included file
        const nestedInclusions = this.#resolveInclusions(
          includedfile,
          visitedFiles,
        );
        for (const [name, symbol] of nestedInclusions.symbols) {
          inclusions.symbols.set(name, symbol);
        }
        inclusions.internal.children.set(path, {
          name: path,
          children: nestedInclusions.internal.children,
        });
        for (const node of nestedInclusions.standard) {
          inclusions.standard.set(node[0], node[1]);
        }
        // Associate function definitions to their signatures
        const funcdefs = Array.from(
          file.symbols.entries().filter(([, s]) =>
            s instanceof FunctionDefinition
          ).map(([, s]) => s as FunctionDefinition),
        );
        for (const funcdef of funcdefs) {
          if (inclusions.symbols.has(funcdef.name)) {
            const symbol = inclusions.symbols.get(funcdef.name);
            if (symbol && symbol instanceof FunctionSignature) {
              funcdef.signature = symbol;
              symbol.definition = funcdef;
            }
          }
        }
      }
    }

    for (const node of standardIncludeNodes) {
      const child = node.node.childForFieldName("path");
      if (child) {
        inclusions.standard.set(child.text, node.node);
      }
    }

    // Save inclusions in cache
    this.#inclusionCache.set(file, inclusions);
    return inclusions;
  }

  /**
   * Retrieves the inclusions of all files and caches the results.
   * @returns A map of file paths to their inclusions.
   */
  getInclusions() {
    if (!this.#inclusions) {
      this.#inclusions = new Map();
      for (const file of this.symbolRegistry.values()) {
        const inclusions = this.#resolveInclusions(file);
        this.#inclusions.set(file.file.path, inclusions);
      }
    }
    return this.#inclusions;
  }
}
