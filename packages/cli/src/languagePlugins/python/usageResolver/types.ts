import { PythonModule } from "../moduleResolver/types";
import { PythonSymbol } from "../exportExtractor/types";

/**
 * Represents usage information for a Python module, containing the module reference
 * and a map of symbols used from that module
 */
export interface InternalUsage {
  /** The Python module being used */
  module: PythonModule;
  /** Map of symbol IDs to their corresponding PythonSymbol objects that are used in the code */
  symbols: Map<string, PythonSymbol>;
}

/**
 * Represents usage information for an external Python module (e.g., from standard library or third-party packages)
 */
export interface ExternalUsage {
  /** The name of the external module */
  moduleName: string;
  /** Set of specific items (functions, classes, variables) used from this module */
  itemNames: Set<string>;
}
