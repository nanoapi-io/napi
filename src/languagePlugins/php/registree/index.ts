import type Parser from "tree-sitter";
import { PHPRegistry, PHPTree } from "./types.ts";

export class PHPRegistree {
  registry: PHPRegistry;
  tree: PHPTree;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.registry = new PHPRegistry(files);
    this.tree = new PHPTree(files);
  }
}
