import { ExportedSymbol } from "../headerResolver/types.js";
import { CHeaderResolver } from "../headerResolver/index.js";
import {
  DataType,
  Function,
  Typedef,
  Variable,
  CFile,
  Symbol,
} from "./types.js";
import {
  StorageClassSpecifier,
  TypeQualifier,
} from "../headerResolver/types.js";
import { C_FUNCTION_DEF_QUERY, C_TYPEDEF_TYPE_QUERY } from "./queries.js";
import Parser from "tree-sitter";

export class CSymbolRegistry {
  headerResolver: CHeaderResolver;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  #registry: Map<string, CFile>;

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
    if (["struct", "enum", "union"].includes(es.type)) {
      const symbol = new DataType();
      symbol.name = es.name;
      symbol.declaration = es;
      return symbol;
    }
    if (es.type === "typedef") {
      const symbol = new Typedef();
      symbol.name = es.name;
      symbol.declaration = es;
      return symbol;
    }
    if (es.type === "function") {
      const symbol = new Function();
      symbol.name = es.name;
      symbol.declaration = es;
      symbol.definition = es.node;
      symbol.definitionPath = es.filepath;
      symbol.isMacro = es.node.type === "preproc_function_def";
      return symbol;
    }
    if (es.type === "variable") {
      const symbol = new Variable();
      symbol.name = es.name;
      symbol.declaration = es;
      symbol.isMacro = es.node.type === "preproc_def";
      return symbol;
    }
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
      file.path.endsWith(".h"),
    );
    for (const file of headerFiles) {
      const exportedSymbols = this.headerResolver.resolveSymbols(file);
      const header = new CFile();
      header.type = ".h";
      header.file = file;
      header.symbols = new Map();
      for (const es of exportedSymbols) {
        const symbol = this.#convertSymbol(es);
        if (symbol instanceof DataType && !header.symbols.has(symbol.name)) {
          // Typedefs get priority over structs if they both have the same name
          // That is because if they both have the same name, that means that the typedef
          // also includes the struct's definition
          header.symbols.set(symbol.name, symbol);
        } else {
          header.symbols.set(symbol.name, symbol);
        }
      }
      // Add the header file to the registry
      this.#registry.set(file.path, header);
    }

    // Iterate over all source files to find function definitions.
    const sourceFiles = Array.from(this.files.values()).filter((file) =>
      file.path.endsWith(".c"),
    );
    for (const file of sourceFiles) {
      // We still need to resolve the symbols in the source files
      // because they can depend on eachother.
      // However they are not global.
      const exportedSymbols = this.headerResolver.resolveSymbols(file);
      const source = new CFile();
      source.type = ".c";
      source.file = file;
      source.symbols = new Map();
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
      }
      // Add the source file to the registry
      this.#registry.set(file.path, source);

      // Look for function definitions in the source file
      const query = C_FUNCTION_DEF_QUERY;
      const captures = query.captures(file.rootNode);
      for (const capture of captures) {
        let currentNode = capture.node;
        // Traverse the tree to find the identifier node
        // cf. header resolver.
        while (
          !currentNode.childForFieldName("declarator") ||
          currentNode.childForFieldName("declarator").type !== "identifier"
        ) {
          if (!currentNode.childForFieldName("declarator")) {
            currentNode = currentNode.firstNamedChild;
          } else {
            currentNode = currentNode.childForFieldName("declarator");
          }
        }
        const name = currentNode.childForFieldName("declarator").text;
        let foundInRegistry = false;
        for (const [, header] of this.#registry.entries()) {
          if (header.symbols.has(name)) {
            const symbol = header.symbols.get(name);
            if (symbol instanceof Function) {
              symbol.definitionPath = file.path;
              symbol.definition = capture.node;
              foundInRegistry = true;
            }
          }
        }
        if (!foundInRegistry) {
          // If the function is not found in the registry, add it to the source file
          const symbol = new Function();
          const specifiers = capture.node.children
            .filter((child) => child.type === "storage_class_specifier")
            .map((child) => child.text);
          const qualifiers = capture.node.children
            .filter((child) => child.type === "type_qualifier")
            .map((child) => child.text);
          const idNode = capture.node.childForFieldName("declarator");
          symbol.name = name;
          symbol.declaration = {
            name,
            type: "function",
            node: capture.node,
            identifierNode: idNode,
            filepath: file.path,
            specifiers: specifiers as StorageClassSpecifier[],
            qualifiers: qualifiers as TypeQualifier[],
          };
          symbol.definitionPath = file.path;
          symbol.definition = capture.node;
          symbol.isMacro = capture.node.type === "preproc_function_def";
          source.symbols.set(name, symbol);
        }
      }
    }

    // Associate typedefs with their corresponding data types
    for (const [, header] of this.#registry.entries()) {
      for (const symbol of header.symbols
        .values()
        .filter((s) => s instanceof Typedef)
        .map((s) => s as Typedef)) {
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
    return this.#registry;
  }
}
