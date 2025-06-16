import { JavaTree } from "./types.ts";
import type Parser from "tree-sitter";
import { JavaPackageResolver } from "../packageResolver/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";

/**
 * Maps Java files to their respective packages and builds a tree representation.
 */
export class JavaPackageMapper {
  /** A tree structure representing the Java package hierarchy. */
  tree: JavaTree;

  /** A map of file paths to their resolved JavaFile representations. */
  files: Map<string, JavaFile>;

  /**
   * Constructs a new JavaPackageMapper instance.
   *
   * @param files - A map where each key is a file path and each value is an object containing
   *                the file path and its root syntax node.
   */
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = new Map();
    this.tree = new JavaTree();
    const resolver = new JavaPackageResolver();
    for (const f of files.values()) {
      const resolvedFile = resolver.resolveFile(f);
      if (!resolvedFile) {
        continue;
      }
      this.tree.addFile(resolvedFile);
      this.files.set(f.path, resolvedFile);
    }
  }
}
