import type { PythonModule } from "../moduleResolver/types.ts";
import type { PythonSymbol } from "../exportExtractor/types.ts";

/**
 * Represents usage information for a Python module, containing the module reference
 * and a map of symbols used from that module.
 *
 * This is used to track how internal project modules are used within the codebase,
 * including which specific symbols are referenced from each module.
 */
export interface InternalUsage {
  /** The Python module being used */
  module: PythonModule;
  /** Map of symbol IDs to their corresponding PythonSymbol objects that are used in the code */
  symbols: Map<string, PythonSymbol>;
  /**
   * Optional information about re-exporting modules (modules that re-export this module's symbols)
   * This helps track indirect dependencies through re-exports
   */
  reExportingModules?: Map<string, PythonModule>;
}

/**
 * Represents usage information for an external Python module (e.g., from standard library or third-party packages).
 *
 * Unlike InternalUsage, this only tracks the module name and which symbols are used,
 * since we don't have access to the full AST information for external modules.
 */
export interface ExternalUsage {
  /** The name of the external module (e.g., 'os', 'numpy', etc.) */
  moduleName: string;
  /** Set of specific items (functions, classes, variables) used from this module */
  itemNames: Set<string>;
}
