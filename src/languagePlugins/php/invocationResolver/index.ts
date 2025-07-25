import type { Invocations } from "./types.ts";
import { PHP_INVOCATION_QUERY } from "./queries.ts";
import type { PHPIncluseResolver } from "../incluseResolver/index.ts";
import type Parser from "tree-sitter";
import type { ExportedSymbol } from "../exportResolver/types.ts";
import { SymbolNode } from "../registree/types.ts";

export class PHPInvocationResolver {
  incluseResolver: PHPIncluseResolver;

  constructor(incluseResolver: PHPIncluseResolver) {
    this.incluseResolver = incluseResolver;
  }

  getInvocationsForNode(
    node: Parser.SyntaxNode,
    filepath: string,
    symbolname: string | undefined = undefined,
  ): Invocations {
    const currentfile = this.incluseResolver.registree.registry.files.get(
      filepath,
    )!;
    const availableSymbols = this.incluseResolver
      .resolveImports(currentfile)?.resolved;
    const localSymbols = currentfile.symbols;
    const unresolved = new Set<string>();
    const resolved = new Map<string, ExportedSymbol[]>();
    const captures = PHP_INVOCATION_QUERY.captures(node);
    for (const capture of captures) {
      const name = capture.node.text;
      // if the symbol name is the same as the one we are looking at, skip it
      if (symbolname && name === symbolname) {
        continue;
      }
      if (availableSymbols && availableSymbols.has(name)) {
        const availableSymbol = availableSymbols.get(name);
        if (!availableSymbol) {
          unresolved.add(name);
          continue;
        }
        resolved.set(name, availableSymbol);
      } else if (localSymbols && localSymbols.has(name)) {
        const localSymbol = localSymbols.get(name);
        if (!localSymbol) {
          unresolved.add(name);
          continue;
        }
        resolved.set(name, localSymbol);
      } else if (capture.name === "qualified") {
        const qualSymbol = this.incluseResolver.registree.tree.findNode(name);
        if (qualSymbol && qualSymbol instanceof SymbolNode) {
          resolved.set(name, qualSymbol.symbols);
        } else {
          unresolved.add(name);
        }
      } else {
        unresolved.add(name);
      }
    }
    return {
      resolved,
      unresolved,
    };
  }

  getInvocationsForFile(filepath: string): Invocations {
    const file = this.incluseResolver.registree.registry.files.get(filepath);
    if (!file) {
      throw new Error(`File not found: ${filepath}`);
    }
    return this.getInvocationsForNode(file.rootNode, file.path);
  }
}
