/** Identifies the "class" instance type. */
export const classSymbolType = "class";

/** Identifies the "struct" instance type. */
export const structSymbolType = "struct";

/** Identifies the "enum" instance type. */
export const enumSymbolType = "enum";

/** Identifies the "union" instance type. */
export const unionSymbolType = "union";

/** Identifies the "typedef" instance type. */
export const typedefSymbolType = "typedef";

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
  | typeof enumSymbolType
  | typeof unionSymbolType
  | typeof typedefSymbolType;

export const metricLinesCount = "linesCount";
export const metricCodeLineCount = "codeLineCount";
export const metricCharacterCount = "characterCount";
export const metricCodeCharacterCount = "codeCharacterCount";
export const metricDependencyCount = "dependencyCount";
export const metricDependentCount = "dependentCount";
export const metricCyclomaticComplexity = "cyclomaticComplexity";

export type Metric =
  | typeof metricLinesCount
  | typeof metricCodeLineCount
  | typeof metricCharacterCount
  | typeof metricCodeCharacterCount
  | typeof metricDependencyCount
  | typeof metricDependentCount
  | typeof metricCyclomaticComplexity;

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
export interface SymbolDependencyManifest {
  /** Unique name for this symbol (e.g., the class name or function name). */
  id: string;
  /** The type of this symbol: "class", "function", or "variable". */
  type: SymbolType;
  /** Metrics for the symbol. */
  metrics: {
    /** The number of lines in the symbol. */
    [metricLinesCount]: number;
    /** The number of lines in the symbol. */
    [metricCodeLineCount]: number;
    /** The number of characters in the symbol. */
    [metricCharacterCount]: number;
    /** The number of characters in the symbol. */
    [metricCodeCharacterCount]: number;
    /** The number of dependencies on the symbol. */
    [metricDependencyCount]: number;
    /** The number of dependents on the symbol. */
    [metricDependentCount]: number;
    /** The cyclomatic complexity of the symbol. */
    [metricCyclomaticComplexity]: number;
  };
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
export interface FileDependencyManifest {
  /** A unique identifier for the file, often the file path. */
  id: string;
  /** The path or name of the file (e.g. "src/app/main.py"). */
  filePath: string;
  /** The programming language of the file. It may be extended in the future to handle other languages. */
  language: string;
  /** The metrics for the file. */
  metrics: {
    /** The number of lines in the symbol. */
    [metricLinesCount]: number;
    /** The number of lines in the symbol. */
    [metricCodeLineCount]: number;
    /** The number of characters in the symbol. */
    [metricCharacterCount]: number;
    /** The number of characters in the symbol. */
    [metricCodeCharacterCount]: number;
    /** The number of dependencies on the symbol. */
    [metricDependencyCount]: number;
    /** The number of dependents on the symbol. */
    [metricDependentCount]: number;
    /** The cyclomatic complexity of the symbol. */
    [metricCyclomaticComplexity]: number;
  };
  /** Dependencies at the file level. If this file imports other files/packages,
   * each one appears here (with the associated symbols used). */
  dependencies: Record<string, DependencyInfo>;
  /** Dependents at the file level. If this file is used by other files/packages,
   * each one appears here (with the associated symbols used). */
  dependents: Record<string, DependentInfo>;
  /** Symbols (classes, functions, variables) declared in this file, keyed by symbol name (ID).
   * Each symbol may also have dependencies and dependents of its own. */
  symbols: Record<string, SymbolDependencyManifest>;
}

/** A global structure mapping each file's unique ID (often its file path)
 * to its `FileManifest`. This collectively represents the project's
 * dependency graph or manifest. */
export type DependencyManifest = Record<string, FileDependencyManifest>;
