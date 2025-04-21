import { PythonSymbol } from "../exportExtractor/types.js";
import { PythonModule } from "../moduleResolver/types.js";

/**
 * Constant representing an internal Python module/symbol that can be resolved
 * within the project's source code.
 */
export const PYTHON_INTERNAL_MODULE_TYPE = "internal";

/**
 * Constant representing an external Python module/symbol that comes from
 * third-party dependencies or standard library and cannot be directly analyzed.
 */
export const PYTHON_EXTERNAL_MODULE_TYPE = "external";

/**
 * Represents the type of a Python module or symbol - either internal (within the project)
 * or external (from third-party libraries or standard library).
 *
 * Internal items exist within the project's codebase and can be analyzed directly.
 * External items are from third-party libraries or the standard library and only their
 * references can be tracked.
 */
export type PythonModuleType =
  | typeof PYTHON_INTERNAL_MODULE_TYPE
  | typeof PYTHON_EXTERNAL_MODULE_TYPE;

/**
 * Represents a resolved Python item (module or symbol) after the resolution process.
 *
 * This interface is the base for both internal and external resolved items and contains
 * properties relevant to both types. The concrete type (internal/external) determines
 * which fields will be populated.
 *
 * This is used as the base interface for more specific resolved item types.
 */
export interface ResolvedItem {
  /** Indicates whether the item is internal or external */
  type: PythonModuleType;
  /** For internal items, the resolved module reference */
  module?: PythonModule;
  /** For internal items that are symbols, the symbol definition */
  symbol?: PythonSymbol;
  /** For external items, the name of the module */
  moduleName?: string;
  /** For external items that are symbols, the name of the symbol */
  symbolName?: string;
}

/**
 * Represents a resolved Python module after the resolution process.
 *
 * This specialized interface is for modules (as opposed to symbols) and serves
 * as a base for both internal and external module references.
 *
 * It includes all properties from ResolvedItem but with a focus on module-specific attributes.
 * Concrete implementations include ResolvedInternalModule and ResolvedExternalModule.
 */
export interface ResolvedModule extends ResolvedItem {
  /** Indicates whether the module is internal or external */
  type: PythonModuleType;
  /** For internal modules, the resolved module reference */
  module?: PythonModule;
  /** For external modules, the name of the module */
  moduleName?: string;
}

/**
 * Represents a resolved internal Python module that exists within the analyzed project.
 *
 * Internal modules are those defined within the project's source code that can be
 * directly analyzed. This interface specifically represents modules, not symbols.
 *
 * Example: A module like "myproject.utils" defined within the project's codebase.
 */
export interface ResolvedInternalModule extends ResolvedModule {
  /** Always set to "internal" for internal modules */
  type: typeof PYTHON_INTERNAL_MODULE_TYPE;

  /** Reference to the resolved Python module */
  module: PythonModule;
}

/**
 * Represents a resolved external Python module that comes from outside the analyzed project.
 *
 * External modules are those defined in third-party libraries or Python's standard library
 * that cannot be directly analyzed. We can only track their names and references.
 * This interface specifically represents modules, not symbols.
 *
 * Examples: Standard library modules like "os" or "sys", or third-party modules like "numpy" or "pandas".
 */
export interface ResolvedExternalModule extends ResolvedModule {
  /** Always set to "external" for external modules */
  type: typeof PYTHON_EXTERNAL_MODULE_TYPE;

  /** The name of the external module */
  moduleName: string;
}

/**
 * Represents a resolved Python symbol (not a module) after the resolution process.
 *
 * This specialized interface is for symbols (as opposed to modules) and serves
 * as a base for both internal and external symbol references.
 *
 * Symbols include functions, classes, variables, or any other named entity in Python.
 * Concrete implementations include ResolvedInternalSymbol and ResolvedExternalSymbol.
 */
export interface ResolvedSymbol extends ResolvedItem {
  /** Indicates whether the symbol is internal or external */
  type: PythonModuleType;

  /** For internal symbols, the module where the symbol is defined */
  module?: PythonModule;

  /** For internal symbols, the symbol definition */
  symbol?: PythonSymbol;

  /** For external symbols, the name of the module */
  moduleName?: string;

  /** For external symbols, the name of the symbol */
  symbolName?: string;
}

/**
 * Represents a resolved internal Python symbol defined within the analyzed project.
 *
 * Used specifically for symbols (variables, functions, classes) that are defined
 * within the project's source code and can be directly analyzed.
 *
 * Internal symbols have complete information available including their module location
 * and full symbol definition with metadata.
 *
 * Example: A function called "process_data" defined in a module within the project.
 */
export interface ResolvedInternalSymbol extends ResolvedSymbol {
  /** Always set to "internal" for internal symbols */
  type: typeof PYTHON_INTERNAL_MODULE_TYPE;

  /** The module where the symbol is defined */
  module: PythonModule;

  /** The symbol definition */
  symbol: PythonSymbol;

  /**
   * Chain of modules that re-export this symbol
   * This tracks the re-export path when a symbol is imported and then re-exported by another module.
   */
  reExportChain: PythonModule[];
}

/**
 * Represents a resolved external Python symbol that comes from outside the analyzed project.
 *
 * External symbols are those defined in third-party libraries or Python's standard library
 * that cannot be directly analyzed. We can only track their names and references.
 *
 * Examples: Functions like "os.path.join" from the standard library, or third-party
 * classes like "pandas.DataFrame".
 */
export interface ResolvedExternalSymbol extends ResolvedSymbol {
  /** Always set to "external" for external symbols */
  type: typeof PYTHON_EXTERNAL_MODULE_TYPE;

  /** The name of the external module */
  moduleName: string;

  /** The name of the external symbol */
  symbolName: string;
}
