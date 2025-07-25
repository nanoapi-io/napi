import type { ExportedSymbol } from "../exportResolver/types.ts";

export interface Invocations {
  resolved: Map<string, ExportedSymbol[]>;
  unresolved: Set<string>;
}
