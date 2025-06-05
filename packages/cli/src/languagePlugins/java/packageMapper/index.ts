import { JavaTree } from "./types.ts";
import type Parser from "tree-sitter";
import { JavaPackageResolver } from "../packageResolver/index.ts";

export class JavaPackageMapper {
  tree: JavaTree;
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = files;
    this.tree = new JavaTree();
    const resolver = new JavaPackageResolver();
    for (const f of files.values()) {
      this.tree.addFile(resolver.resolveFile(f));
    }
  }
}
