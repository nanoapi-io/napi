import type { PythonSymbolType } from "../exportExtractor/types.ts";

/**
 * Represents a dependency on a specific module.
 * This includes both internal project modules and external libraries.
 */
export interface ModuleDependency {
  /** Module identifier (typically the file path) */
  id: string;
  /** True if this is an external dependency (stdlib/third-party) */
  isExternal: boolean;
  /**
   * True if this module is a namespace module
   * Usefull to have because namespace modules are not files
   */
  isNamespaceModule: boolean;
  /** Symbols used from this module, mapping symbol ID to symbol name */
  symbols: Set<string>;
}

/**
 * Represents dependency information for a specific exported symbol (function, class, variable).
 * This is used for fine-grained code splitting.
 */
export interface SymbolDependency {
  /** Symbol identifier */
  id: string;
  /** Symbol type (class, function, variable) */
  type: PythonSymbolType;
  /** Size metrics for the symbol */
  metrics: {
    /** Total character count in the symbol */
    characterCount: number;
    /** Total character count in the symbol */
    codeCharacterCount: number;
    /** Total line count in the symbol */
    linesCount: number;
    /** Total line count in the symbol */
    codeLineCount: number;
    /** Total cyclomatic complexity of the symbol */
    cyclomaticComplexity: number;
  };
  /** Map of modules this symbol depends on */
  dependencies: Map<string, ModuleDependency>;
}

/**
 * Represents comprehensive dependency information for a file.
 */
export interface FileDependencies {
  /** The path to the analyzed file */
  filePath: string;
  /** File size metrics */
  metrics: {
    /** Total character count in the symbol */
    characterCount: number;
    /** Total character count in the symbol */
    codeCharacterCount: number;
    /** Total line count in the symbol */
    linesCount: number;
    /** Total line count in the symbol */
    codeLineCount: number;
    /** Total cyclomatic complexity of the symbol */
    cyclomaticComplexity: number;
  };
  /** Module-level dependencies for the entire file */
  dependencies: Map<string, ModuleDependency>;
  /** Exported symbols with their individual dependency info */
  symbols: SymbolDependency[];
}

/**
 * Complete module dependency graph for an entire project.
 * Maps file paths to their dependency information.
 */
export type FileDependencyMap = Map<string, FileDependencies>;
