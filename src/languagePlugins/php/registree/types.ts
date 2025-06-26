import type Parser from "tree-sitter";
import type {
  ExportedNamespace,
  ExportedSymbol,
} from "../exportResolver/types.ts";
import { PHPExportResolver } from "../exportResolver/index.ts";

export interface PHPNode {
  name: string;
  children: Map<string, PHPNode>;
}

export class NamespaceNode implements PHPNode {
  name: string;
  children: Map<string, PHPNode>;

  constructor(name: string) {
    this.name = name;
    this.children = new Map();
  }
}

export class SymbolNode implements PHPNode {
  name: string;
  children: Map<string, PHPNode>;
  symbols: ExportedSymbol[];
  constructor(symbol: ExportedSymbol) {
    this.name = symbol.name;
    this.children = new Map();
    this.symbols = [symbol];
  }
}

export class PHPTree extends NamespaceNode {
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    super("");
    const resolver = new PHPExportResolver();
    for (const [, file] of files) {
      this.addNamespaces(Array.from(resolver.resolveFile(file).values()));
    }
  }

  addNamespaces(namespaces: ExportedNamespace[]) {
    for (const ns of namespaces) {
      const nsparts = ns.name.split("\\");
      let current = this.children;
      for (const p of nsparts) {
        if (!current.has(p)) {
          current.set(p, new NamespaceNode(p));
        }
        current = current.get(p)!.children;
      }
      for (const s of ns.symbols) {
        if (!current.has(s.name)) {
          current.set(s.name, new SymbolNode(s));
        } else {
          const snode = current.get(s.name)!;
          if (!(snode instanceof SymbolNode)) {
            throw Error(
              `${s.name} is used both for a namespace and a symbol in ${ns.name}`,
            );
          } else {
            snode.symbols.push(s);
          }
        }
      }
    }
  }
}

export interface PHPFile {
  path: string;
  rootNode: Parser.SyntaxNode;
  symbols: Map<string, ExportedSymbol[]>;
}

export class PHPRegistry {
  files: Map<string, PHPFile>;
  resolver: PHPExportResolver;
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.resolver = new PHPExportResolver();
    this.files = new Map();
    for (const [, file] of files) {
      this.addFile(file);
    }
  }

  addFile(file: { path: string; rootNode: Parser.SyntaxNode }) {
    const exported = this.resolver.resolveFile(file);
    const symbols: Map<string, ExportedSymbol[]> = new Map();
    for (const [, ns] of exported) {
      for (const s of ns.symbols) {
        if (!symbols.has(s.name)) {
          symbols.set(s.name, []);
        }
        symbols.get(s.name)!.push(s);
      }
    }
    this.files.set(file.path, {
      path: file.path,
      rootNode: file.rootNode,
      symbols,
    });
  }
}
