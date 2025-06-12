import { JavaTree } from "./types.ts";
import type Parser from "tree-sitter";
import { JavaPackageResolver } from "../packageResolver/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";

export class JavaPackageMapper {
  tree: JavaTree;
  files: Map<string, JavaFile>;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = new Map();
    this.tree = new JavaTree();
    const resolver = new JavaPackageResolver();
    for (const f of files.values()) {
      const resolvedFile = resolver.resolveFile(f);
      this.tree.addFile(resolvedFile);
      this.files.set(f.path, resolvedFile);
    }
  }
}
