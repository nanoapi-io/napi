import type { ConcreteNode } from "../packageMapper/types.ts";

export interface JavaImports {
  resolved: Map<string, ConcreteNode>;
  unresolved: string[];
}
