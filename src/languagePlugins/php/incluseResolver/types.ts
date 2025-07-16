import type { ExportedSymbol } from "../exportResolver/types.ts";

export interface PHPImports {
  resolved: Map<string, ExportedSymbol[]>;
  unresolved: {
    paths: Set<string>;
    namespaces: Set<string>;
  };
}
