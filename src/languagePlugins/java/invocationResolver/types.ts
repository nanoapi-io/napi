import type { ConcreteNode } from "../packageMapper/types.ts";

/**
 * Represents a collection of invocations.
 */
export interface Invocations {
  /**
   * A map of resolved invocations, where the key is a string identifier
   * and the value is a `ConcreteNode` object.
   */
  resolved: Map<string, ConcreteNode>;

  /**
   * A set of unresolved invocation identifiers.
   */
  unresolved: Set<string>;
}
