/** Identifies the "class" instance type. */
export const classSymbolType = "class";

/** Identifies the "function" instance type. */
export const functionSymbolType = "function";

/** Identifies the "variable" instance type.  */
export const variableSymbolType = "variable";

/** Possible categories of an instance (symbol) within a file:
 * - class
 * - function
 * - variable */
export type SymbolType =
  | typeof classSymbolType
  | typeof functionSymbolType
  | typeof variableSymbolType;

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

export interface AuditMessage {
  shortMessage: string;
  longMessage: string;
  code: string;
  value: string;
  target: string;
  severity: number;
}

export interface SymbolAuditManifest {
  id: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
}

export interface FileAuditManifest {
  id: string;
  filePath: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
  symbols: Record<string, SymbolAuditManifest>;
}

export type AuditManifest = Record<string, FileAuditManifest>;

export interface AuditResponse {
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
}
