import type { Invocations } from "./types.ts";
import { C_INVOCATION_QUERY, C_MACRO_CONTENT_QUERY } from "./queries.ts";
import type { CIncludeResolver } from "../includeResolver/index.ts";
import {
  DataType,
  EnumMember,
  FunctionDefinition,
  FunctionSignature,
  type Symbol,
} from "../symbolRegistry/types.ts";
import type Parser from "npm:tree-sitter";
import { cParser } from "../../../helpers/treeSitter/parsers.ts";

export class CInvocationResolver {
  includeResolver: CIncludeResolver;

  constructor(includeResolver: CIncludeResolver) {
    this.includeResolver = includeResolver;
  }

  getInvocationsForNode(
    node: Parser.SyntaxNode,
    filepath: string,
    symbolname: string | undefined = undefined,
  ): Invocations {
    const availableSymbols = this.includeResolver
      .getInclusions()
      .get(filepath)?.symbols;
    const localSymbols = this.includeResolver.symbolRegistry.get(filepath)
      ?.symbols;
    const unresolved = new Set<string>();
    const resolved = new Map<string, Symbol>();
    const captures = C_INVOCATION_QUERY.captures(node);
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
        resolved.set(name, availableSymbol.symbol);
      } else if (localSymbols && localSymbols.has(name)) {
        const localSymbol = localSymbols.get(name);
        if (!localSymbol) {
          unresolved.add(name);
          continue;
        }
        resolved.set(name, localSymbol);
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
    const filepath = symbol.declaration.filepath;
    const node = symbol.declaration.node;
    const name = symbol.name;
    const invocations = this.getInvocationsForNode(node, filepath, name);
    const resolved = invocations.resolved;
    if (symbol instanceof FunctionSignature && symbol.definition) {
      resolved.set(symbol.name, symbol.definition);
    }
    if (symbol instanceof FunctionDefinition && symbol.signature) {
      resolved.set(symbol.name, symbol.signature);
    }
    if (symbol instanceof DataType) {
      const typedefs = symbol.typedefs;
      for (const [key, value] of typedefs) {
        resolved.set(key, value);
      }
    }
    // Replace enum members with their parent enum
    for (const [key, value] of resolved) {
      if (value instanceof EnumMember) {
        const parent = value.parent;
        if (!resolved.has(parent.name) && parent.name !== symbol.name) {
          resolved.set(parent.name, parent);
        }
        resolved.delete(key);
      }
    }
    return {
      resolved: invocations.resolved,
      unresolved: invocations.unresolved,
    };
  }

  getInvocationsForFile(filepath: string): Invocations {
    let symbols = this.includeResolver.symbolRegistry.get(filepath)?.symbols;
    if (!symbols) {
      symbols = new Map();
    }
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
