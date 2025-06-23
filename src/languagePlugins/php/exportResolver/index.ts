import type Parser from "tree-sitter";
import type { ExportedNamespace, ExportedSymbol } from "./types.ts";
import { INTERESTING_NODES, PHP_IDNODE_QUERY } from "./queries.ts";

export class PHPExportResolver {
  #currentNamespace: string = "";
  #currentFile: string = "";

  resolveFile(
    file: { path: string; rootNode: Parser.SyntaxNode },
  ): Map<string, ExportedNamespace> {
    const namespaces: Map<string, ExportedNamespace> = new Map();
    this.#currentNamespace =
      file.rootNode.children.find((c) =>
        c.type === "namespace_definition" && !c.childForFieldName("body")
      )?.childForFieldName("name")?.text ?? "";
    this.#currentFile = file.path;
    const allSymbols = this.#resolveNode(file.rootNode, this.#currentNamespace);
    for (const symbol of allSymbols) {
      if (!namespaces.has(symbol.namespace)) {
        namespaces.set(symbol.namespace, {
          name: symbol.namespace,
          symbols: [],
        });
      }
      namespaces.get(symbol.namespace)!.symbols.push(symbol);
    }
    return namespaces;
  }

  #resolveNode(node: Parser.SyntaxNode, nsname: string): ExportedSymbol[] {
    const exports: ExportedSymbol[] = [];
    for (const child of node.children) {
      if (INTERESTING_NODES.has(child.type)) {
        const idNode = PHP_IDNODE_QUERY.captures(child).at(0);
        if (!idNode) {
          continue;
        }
        const symType = INTERESTING_NODES.get(child.type)!;
        exports.push({
          name: idNode.node.text,
          type: symType,
          filepath: this.#currentFile,
          namespace: nsname,
          node: child,
          idNode: idNode.node,
        });
      }
    }
    for (
      const ns of node.children.filter((c) =>
        c.type === "namespace_definition" && c.childForFieldName("body")
      )
    ) {
      const fullnsname = (nsname !== "" ? nsname + "\\" : "") +
        ns.childForFieldName("name")!;
      const nsnode = ns.childForFieldName("body")!;
      exports.push(...this.#resolveNode(nsnode, fullnsname));
    }
    return exports;
  }
}
