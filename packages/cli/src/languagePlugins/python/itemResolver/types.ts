import { PythonSymbol } from "../exportExtractor/types";
import { PythonModule } from "../moduleResolver/types";

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
 */
export type PythonModuleType =
  | typeof PYTHON_INTERNAL_MODULE_TYPE
  | typeof PYTHON_EXTERNAL_MODULE_TYPE;

/**
 * Represents a resolved Python item (module or symbol) after the resolution process.
 *
 * This interface is the base for both internal and external resolved items and contains
 * properties relevant to both types. The concrete type (internal/external) determines
 */
export interface ResolvedItem {
  /* Indicates whether the item is internal or external */
  type: PythonModuleType;
  /* For internal items, the resolved module reference */
  module?: PythonModule;
  /* For internal items that are symbols, the symbol definition */
  symbol?: PythonSymbol;
  /* For external items, the name of the module */
  moduleName?: string;
  /* For external items that are symbols, the name of the symbol */
  symbolName?: string;
}

/**
 * Represents a resolved Python module after the resolution process.
 *
 * This specialized interface is for modules (as opposed to symbols) and serves
 * as a base for both internal and external module references.
 */
export interface ResolvedModule extends ResolvedItem {
  /* Indicates whether the module is internal or external */
  type: PythonModuleType;
  /* For internal modules, the resolved module reference */
  module?: PythonModule;
  /* For external modules, the name of the module */
  moduleName?: string;
}

/**
 * Represents a resolved internal Python module that exists within the analyzed project.
 *
 * Internal modules are those defined within the project's source code that can be
 * directly analyzed. This interface specifically represents modules, not symbols.
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
 */
export interface ResolvedInternalSymbol extends ResolvedSymbol {
  /** Always set to "internal" for internal symbols */
  type: typeof PYTHON_INTERNAL_MODULE_TYPE;

  /** The module where the symbol is defined */
  module: PythonModule;

  /** The symbol definition */
  symbol: PythonSymbol;
}

/**
 * Represents a resolved external Python symbol that comes from outside the analyzed project.
 *
 * External symbols are those defined in third-party libraries or Python's standard library
 * that cannot be directly analyzed. We can only track their names and references.
 */
export interface ResolvedExternalSymbol extends ResolvedSymbol {
  /** Always set to "external" for external symbols */
  type: typeof PYTHON_EXTERNAL_MODULE_TYPE;

  /** The name of the external module */
  moduleName: string;

  /** The name of the external symbol */
  symbolName: string;
}
