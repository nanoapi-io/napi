import type { InclusionNode, Inclusions } from "./types.ts";
import { C_INCLUDE_QUERY, C_STANDARD_INCLUDE_QUERY } from "./queries.ts";
import type { CSymbolRegistry } from "../symbolRegistry/index.ts";
import type Parser from "tree-sitter";
import {
  type CFile,
  FunctionDefinition,
  FunctionSignature,
  type Symbol,
} from "../symbolRegistry/types.ts";
import { dirname, join } from "@std/path";

export class CIncludeResolver {
  symbolRegistry: Map<string, CFile>;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  unresolvedDirectives: Map<string, Set<string>>;
  includeDirs: string[] = [];
  #inclusions?: Map<string, Inclusions>;
  #inclusionCache: Map<CFile, Inclusions>;

  constructor(symbolRegistry: CSymbolRegistry, includeDirs: string[] = []) {
    this.symbolRegistry = symbolRegistry.getRegistry();
    this.files = symbolRegistry.files;
    this.#inclusionCache = new Map();
    this.unresolvedDirectives = new Map();
    this.includeDirs = includeDirs;
  }

  getFile(filepath: string, sourcepath: string): CFile | undefined {
    const filepaths = Array.from(this.symbolRegistry.keys());
    // 1. Check current file's directory
    const sourceDir = dirname(sourcepath);
    const pathfromrelative = join(sourceDir, filepath).replace(/\\/g, "/");
    const corresponding1 = filepaths.find((f) => f === pathfromrelative);
    if (corresponding1) {
      return this.symbolRegistry.get(corresponding1);
    }
    // 2. Check include directories
    for (const dir of this.includeDirs) {
      const pathfrominclude = join(dir, filepath).replace(/\\/g, "/");
      const corresponding = filepaths.find((f) => f === pathfrominclude);
      if (corresponding) {
        return this.symbolRegistry.get(corresponding);
      }
    }
    // 3. Check from workspace root
    const corresponding2 = filepaths.find((f) => f === filepath);
    if (corresponding2) {
      return this.symbolRegistry.get(corresponding2);
    }
    return undefined;
  }

  /**
   * Looks for a chain of inclusions starting from the given file
   * that leads to the given symbol.
   * @param file The file to start the search from.
   * @param symbol The symbol to search for.
   * @returns An array of file paths representing the chain of inclusions.
   */
  findInclusionChain(
    start: string,
    symbol: Symbol,
  ): string[] | undefined {
    const inclusions = this.getInclusions().get(start);
    if (!inclusions) {
      return undefined;
    }
    const chain: string[] = [];
    // Look inside the tree for a node that has a filepath that matches the symbol's file path
    const findInclusion = (node: InclusionNode): boolean => {
      if (node.filepath === symbol.declaration.filepath) {
        chain.push(node.filepath);
        return true;
      }
      for (const child of node.children.values()) {
        if (findInclusion(child)) {
          chain.push(node.filepath);
          return true;
        }
      }
      return false;
    };
    if (findInclusion(inclusions.internal)) {
      chain.reverse(); // Reverse to get the chain from start to symbol
      return chain;
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
        filepath: file.file.path,
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
      const includedfile = this.getFile(path, file.file.path);
      if (!includedfile) {
        if (!this.unresolvedDirectives.has(file.file.path)) {
          this.unresolvedDirectives.set(file.file.path, new Set());
        }
        this.unresolvedDirectives.get(file.file.path)?.add(path);
      } else if (!visitedFiles.has(includedfile.file.path)) {
        // Add the included file's symbols to the current file's symbols
        for (const [name, symbol] of includedfile.symbols) {
          inclusions.symbols.set(name, {
            symbol: symbol,
            includefile: includedfile,
          });
        }
        // Recursively resolve inclusions for the included file
        const nestedInclusions = this.#resolveInclusions(
          includedfile,
          visitedFiles,
        );
        for (const [name, symbol] of nestedInclusions.symbols) {
          inclusions.symbols.set(name, {
            symbol: symbol.symbol,
            includefile: includedfile,
          });
        }
        inclusions.internal.children.set(path, {
          name: path,
          filepath: includedfile.file.path,
          children: nestedInclusions.internal.children,
          parent: inclusions.internal,
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
            if (symbol && symbol.symbol instanceof FunctionSignature) {
              funcdef.signature = symbol.symbol;
              symbol.symbol.definition = funcdef;
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
