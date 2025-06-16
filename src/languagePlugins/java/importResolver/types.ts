import type { ConcreteNode } from "../packageMapper/types.ts";

/**
 * Represents a collection of Java imports, categorized into resolved and unresolved imports.
 */
export interface JavaImports {
  /**
   * A map of resolved imports where the key is the import name and the value is the corresponding ConcreteNode.
   */
  resolved: Map<string, ConcreteNode>;

  /**
   * An array of unresolved import names.
   */
  unresolved: string[];
}
