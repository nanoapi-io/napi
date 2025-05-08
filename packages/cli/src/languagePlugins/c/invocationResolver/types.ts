import { Symbol } from "../symbolRegistry/types.js";

/** Interface representing the invoked symbols in a file */
export interface Invocations {
  /** Symbols that are part of the project */
  resolved: Map<string, Symbol>;
  /** Symbols that are not part of the project or local variables */
  unresolved: Set<string>;
}
