import Parser from "tree-sitter";
import { generatePythonDependencyManifest } from "./python";
import { generateCSharpDependencyManifest } from "./csharp";
import { localConfigSchema } from "../../config/localConfig";
import z from "zod";

/** Identifies the "class" instance type. */
export const classSymbolType = "class";

/** Identifies the "struct" instance type. */
export const structSymbolType = "struct";

/** Identifies the "enum" instance type. */
export const enumSymbolType = "enum";

/** Identifies the "function" instance type. */
export const functionSymbolType = "function";

/** Identifies the "variable" instance type.  */
export const variableSymbolType = "variable";

/** Possible categories of an instance (symbol) within a file:
 * - class
 * - struct
 * - enum
 * - function
 * - variable */
export type SymbolType =
  | typeof classSymbolType
  | typeof functionSymbolType
  | typeof variableSymbolType
  | typeof structSymbolType
  | typeof enumSymbolType;

/** Represents a single dependency. For example, if File A depends on
File B, `DependencyInfo` captures how A uses B's symbols. */
export interface DependencyInfo {
  /** A unique identifier for the dependency, often matching the file path if internal,
   * or a package/module name if external. */
  id: string;
  /** Whether this dependency is an external library/package (true) vs. an internal file (false). */
  isExternal: boolean;
  /** A map of symbol names used from this dependency (key → value).
   * Example:
   * {
   *   "foo": "foo",
   *   "bar": "bar"
   * }
   * For Python-only (current scope), both key and value can be the same string,
   * indicating the file references a symbol by that name. */
  symbols: Record<string, string>;
}

/** Represents a single "dependent": something that depends on the file or symbol in question.
 * For instance, if File X depends on File Y, in Y's "dependents" you'd have an
 * entry for X describing the symbols X uses from Y. */
export interface DependentInfo {
  /** A unique identifier for the dependent, typically the file path or module name. */
  id: string;
  /** A map of symbol names that this dependent references from the file or symbol.
   * Example:
   * {
   *   "myClass": "myClass",
   *   "someFunc": "someFunc"
   * } */
  symbols: Record<string, string>;
}

/** Represents a single named symbol (class, function, or variable) declared in a file.
 * Symbols can have their own dependencies and also be depended upon by others. */
export interface Symbol {
  /** Unique name for this symbol (e.g., the class name or function name). */
  id: string;
  /** The type of this symbol: "class", "function", or "variable". */
  type: SymbolType;
  /** The number of lines in the symbol. */
  lineCount: number;
  /** The number of characters in the symbol. */
  characterCount: number;
  /** Other modules/files on which this symbol depends.
   * Keyed by the dependency's unique ID (often a file path). */
  dependencies: Record<string, DependencyInfo>;
  /** A reverse map of modules/files (or symbols) that depend on this symbol. */
  dependents: Record<string, DependentInfo>;
}

/** Represents a single file in the project, including:
 * - file-level dependencies
 * - file-level dependents
 * - symbols declared in the file */
export interface FileManifest {
  /** A unique identifier for the file, often the file path. */
  id: string;
  /** The path or name of the file (e.g. "src/app/main.py"). */
  filePath: string;
  /** The programming language of the file. It may be extended in the future to handle other languages. */
  language: string;
  /** The number of lines in the file. */
  lineCount: number;
  /** The number of characters in the file. */
  characterCount: number;
  /** Dependencies at the file level. If this file imports other files/packages,
   * each one appears here (with the associated symbols used). */
  dependencies: Record<string, DependencyInfo>;
  /** Symbols (classes, functions, variables) declared in this file, keyed by symbol name (ID).
   * Each symbol may also have dependencies and dependents of its own. */
  symbols: Record<string, Symbol>;
}

/** A global structure mapping each file's unique ID (often its file path)
 * to its `FileManifest`. This collectively represents the project's
 * dependency graph or manifest. */
export type DependencyManifest = Record<string, FileManifest>;

const handlerMap: Record<
  string,
  (
    files: Map<string, { path: string; content: string }>,
    napiConfig: z.infer<typeof localConfigSchema>,
  ) => DependencyManifest
> = {
  python: generatePythonDependencyManifest,
  "c-sharp": generateCSharpDependencyManifest,
};

export class UnsupportedLanguageError extends Error {
  constructor(language: string) {
    const supportedLanguages = Object.keys(handlerMap).join(", ");
    super(
      `Unsupported language: ${language}. Supported languages: ${supportedLanguages}`,
    );
  }
}

export function generateDependencyManifest(
  files: Map<string, { path: string; content: string }>,
  parser: Parser,
  napiConfig: z.infer<typeof localConfigSchema>,
): DependencyManifest {
  const languageName = parser.getLanguage().name;
  const handler = handlerMap[languageName];
  if (!handler) {
    throw new UnsupportedLanguageError(languageName);
  }

  const depMap = handler(files, napiConfig);

  // Sort the keys of the dependency map and consider them all as lowercase
  const sortedKeys = Object.keys(depMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  // Create a new object with sorted keys
  const sortedDepMap: DependencyManifest = {};
  for (const key of sortedKeys) {
    sortedDepMap[key] = depMap[key];

    // Sort the symbols within each file manifest and consider them all as lowercase
    const sortedSymbols = Object.keys(depMap[key].symbols).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    // Then put the symbols in a new object with sorted keys
    // in their original case
    const sortedSymbolsMap: Record<string, Symbol> = {};
    for (const symbolKey of sortedSymbols) {
      sortedSymbolsMap[symbolKey] = depMap[key].symbols[symbolKey];
    }
    // Assign the sorted symbols back to the file manifest
    sortedDepMap[key].symbols = sortedSymbolsMap;
  }

  return sortedDepMap;
}
