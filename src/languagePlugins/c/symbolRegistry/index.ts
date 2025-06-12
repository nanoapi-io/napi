import type { ExportedSymbol } from "../headerResolver/types.ts";
import { CHeaderResolver } from "../headerResolver/index.ts";
import {
  CFile,
  DataType,
  Enum,
  FunctionDefinition,
  FunctionSignature,
  type Symbol,
  Typedef,
  Variable,
} from "./types.ts";
import { C_TYPEDEF_TYPE_QUERY } from "./queries.ts";
import type Parser from "tree-sitter";

export class CSymbolRegistry {
  headerResolver: CHeaderResolver;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #registry?: Map<string, CFile>;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.headerResolver = new CHeaderResolver();
    this.files = files;
  }

  /**
   * Converts an ExportedSymbol to a Symbol.
   * @param es The ExportedSymbol to convert.
   * @returns The converted Symbol.
   */
  #convertSymbol(es: ExportedSymbol): Symbol {
    if (["struct", "union"].includes(es.type)) {
      return new DataType(
        es.name,
        es,
      );
    }
    if (es.type === "enum") {
      return new Enum(
        es.name,
        es,
      );
    }
    if (es.type === "typedef") {
      return new Typedef(
        es.name,
        es,
      );
    }
    if (es.type === "function_definition" || es.type === "macro_function") {
      return new FunctionDefinition(
        es.name,
        es,
        es.node.type === "preproc_function_def",
      );
    }
    if (es.type === "function_signature") {
      return new FunctionSignature(
        es.name,
        es,
        es.node.type === "preproc_function_def",
      );
    }
    if (es.type === "variable" || es.type === "macro_constant") {
      return new Variable(
        es.name,
        es,
        es.node.type === "preproc_def",
      );
    }
    throw new Error(`Could not find symbol type for ${es.name} (${es.type})`);
  }

  /**
   * Builds the symbol registry by iterating over all header and source files.
   * It resolves the symbols in the header files and associates them with their
   * corresponding source files.
   */
  #buildRegistry() {
    this.#registry = new Map();
    // Iterate over all header files and build the registry
    const headerFiles = Array.from(this.files.values()).filter((file) =>
      file.path.endsWith(".h")
    );
    for (const file of headerFiles) {
      const exportedSymbols = this.headerResolver.resolveSymbols(file);
      const header = new CFile(file, ".h");
      for (const es of exportedSymbols) {
        const symbol = this.#convertSymbol(es);
        if (symbol instanceof DataType) {
          // Typedefs get priority over structs if they both have the same name
          // That is because if they both have the same name, that means that the typedef
          // also includes the struct's definition
          if (!header.symbols.has(symbol.name)) {
            header.symbols.set(symbol.name, symbol);
          }
        } else {
          header.symbols.set(symbol.name, symbol);
        }
        if (symbol instanceof Enum) {
          for (const [, enumMember] of symbol.members) {
            header.symbols.set(enumMember.name, enumMember);
          }
        }
      }
      // Add the header file to the registry
      this.#registry.set(file.path, header);
    }

    // Iterate over all source files to find function definitions.
    const sourceFiles = Array.from(this.files.values()).filter((file) =>
      file.path.endsWith(".c")
    );
    for (const file of sourceFiles) {
      // We still need to resolve the symbols in the source files
      // because they can depend on eachother.
      // However they are not global.
      const exportedSymbols = this.headerResolver.resolveSymbols(file);
      const source = new CFile(file, ".c");
      for (const es of exportedSymbols) {
        const symbol = this.#convertSymbol(es);
        if (symbol instanceof DataType && !source.symbols.has(symbol.name)) {
          // Typedefs get priority over structs if they both have the same name
          // That is because if they both have the same name, that means that the typedef
          // also includes the struct's definition
          source.symbols.set(symbol.name, symbol);
        } else {
          source.symbols.set(symbol.name, symbol);
        }
        if (symbol instanceof Enum) {
          for (const [name, enumMember] of symbol.members) {
            source.symbols.set(name, enumMember);
          }
        }
      }
      // Add the source file to the registry
      this.#registry.set(file.path, source);
    }

    // Associate typedefs with their corresponding data types
    for (const [, header] of this.#registry.entries()) {
      for (
        const symbol of header.symbols
          .values()
          .filter((s) => s instanceof Typedef)
          .map((s) => s as Typedef)
      ) {
        const typedefNode = symbol.declaration.node;
        const typeCaptures = C_TYPEDEF_TYPE_QUERY.captures(typedefNode);
        if (typeCaptures.length > 0) {
          const typeCapture = typeCaptures[0];
          const typeNode = typeCapture.node;
          const typeName = typeNode.text;
          for (const [, header] of this.#registry.entries()) {
            if (header.symbols.has(typeName)) {
              const dataType = header.symbols.get(typeName);
              if (dataType instanceof DataType) {
                symbol.datatype = dataType;
                dataType.typedefs.set(symbol.name, symbol);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns the symbol registry. If the registry has not been built yet, it builds it first.
   * @returns The symbol registry.
   */
  getRegistry(): Map<string, CFile> {
    if (!this.#registry) {
      this.#buildRegistry();
    }
    if (!this.#registry) {
      throw new Error("Couldn't build registry for project");
    }
    return this.#registry;
  }
}
