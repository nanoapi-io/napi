import type { ExportedSymbol } from "../exportResolver/types.ts";

export interface PHPImports {
  resolved: Map<string, ExportedSymbol[]>;
  unresolved: {
    paths: string[];
    namespaces: string[];
  };
}
