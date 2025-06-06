import type { ConcreteNode } from "../packageMapper/types.ts";

export interface Invocations {
  resolved: Map<string, ConcreteNode>;
  unresolved: Set<string>;
}
