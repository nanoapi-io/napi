import { Invocations } from "./types.js";
import { C_INVOCATION_QUERY, C_MACRO_CONTENT_QUERY } from "./queries.js";
import { CIncludeResolver } from "../includeResolver/index.js";
import { Symbol, Function } from "../symbolRegistry/types.js";
import Parser from "tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.js";

export class CInvocationResolver {
  includeResolver: CIncludeResolver;

  constructor(includeResolver: CIncludeResolver) {
    this.includeResolver = includeResolver;
  }

  getInvocationsForNode(
    node: Parser.SyntaxNode,
    filepath: string,
    symbolname: string = undefined,
  ): Invocations {
    const availableSymbols = this.includeResolver
      .getInclusions()
      .get(filepath).symbols;
    const localSymbols =
      this.includeResolver.symbolRegistry.get(filepath).symbols;
    const unresolved = new Set<string>();
    const resolved = new Map<string, Symbol>();
    const captures = C_INVOCATION_QUERY.captures(node);
    for (const capture of captures) {
      const name = capture.node.text;
      // if the symbol name is the same as the one we are looking at, skip it
      if (symbolname && name === symbolname) {
        continue;
      }
      if (availableSymbols.has(name)) {
        resolved.set(name, availableSymbols.get(name));
      } else if (localSymbols.has(name)) {
        resolved.set(name, localSymbols.get(name));
      } else {
        unresolved.add(name);
      }
    }
    // Check for macro invocations
    // The logic of a macro is set in a single (preproc_arg) node.
    // If we parse that node's text, we can find the invocations.
    const macroCaptures = C_MACRO_CONTENT_QUERY.captures(node);
    for (const capture of macroCaptures) {
      const contentNode = cParser.parse(capture.node.text).rootNode;
      const contentInvocations = this.getInvocationsForNode(
        contentNode,
        filepath,
        symbolname,
      );
      for (const [key, value] of contentInvocations.resolved) {
        if (!resolved.has(key)) {
          resolved.set(key, value);
        }
      }
      for (const value of contentInvocations.unresolved) {
        unresolved.add(value);
      }
    }
    return {
      resolved,
      unresolved,
    };
  }

  getInvocationsForSymbol(symbol: Symbol) {
    let filepath = symbol.declaration.filepath;
    let node = symbol.declaration.node;
    if (symbol instanceof Function) {
      filepath = symbol.definitionPath;
      node = symbol.definition;
    }
    const name = symbol.name;
    const invocations = this.getInvocationsForNode(node, filepath, name);
    return {
      resolved: invocations.resolved,
      unresolved: invocations.unresolved,
    };
  }

  getInvocationsForFile(filepath: string): Invocations {
    const symbols = this.includeResolver.symbolRegistry.get(filepath).symbols;
    let unresolved = new Set<string>();
    const resolved = new Map<string, Symbol>();
    for (const symbol of symbols.values()) {
      const invocations = this.getInvocationsForSymbol(symbol);
      unresolved = new Set([...unresolved, ...invocations.unresolved]);
      for (const [key, value] of invocations.resolved) {
        if (!resolved.has(key)) {
          resolved.set(key, value);
        }
      }
    }
    return {
      resolved,
      unresolved,
    };
  }
}
