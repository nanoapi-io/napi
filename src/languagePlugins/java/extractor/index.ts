import type Parser from "tree-sitter";
import type { DependencyManifest } from "../../../manifest/dependencyManifest/types.ts";
import { JavaInvocationResolver } from "../invocationResolver/index.ts";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";
import { JavaPackageMapper } from "../packageMapper/index.ts";
import { JavaImportResolver } from "../importResolver/index.ts";
import { ExportedFile } from "./types.ts";

/**
 * Responsible for extracting and managing Java symbols
 * from a set of files, using dependency resolution and package mapping.
 */
export class JavaExtractor {
  manifest: DependencyManifest;
  resolver: JavaInvocationResolver;

  /**
   * Constructs a new instance of `JavaExtractor`.
   *
   * @param files - A map of file paths to their respective content and metadata.
   * @param manifest - The dependency manifest containing information about project dependencies.
   */
  constructor(
    files: Map<string, { path: string; content: string }>,
    manifest: DependencyManifest,
  ) {
    this.manifest = manifest;
    const parsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    for (const [filepath, file] of files) {
      parsedFiles.set(filepath, {
        path: file.path,
        rootNode: javaParser.parse(file.content).rootNode,
      });
    }
    const mapper = new JavaPackageMapper(parsedFiles);
    const importresolver = new JavaImportResolver(mapper);
    this.resolver = new JavaInvocationResolver(importresolver);
  }

  /**
   * Extracts symbols from the provided symbol map and returns a map of files
   * that should be kept, including their paths and content.
   *
   * @param symbolsMap - A map where keys are symbol names and values contain file paths
   * and sets of symbols associated with those files.
   * @returns A map of file paths to their respective content and metadata for files to keep.
   */
  extractSymbols(
    symbolsMap: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ): Map<string, { path: string; content: string }> {
    const exportedfiles = Array.from(
      symbolsMap.keys().map((k) => new ExportedFile(k, this.resolver)),
    );
    const filesToKeep: Map<string, { path: string; content: string }> =
      new Map();
    for (const f of exportedfiles) {
      if (!filesToKeep.has(f.file.path)) {
        filesToKeep.set(f.file.path, {
          path: f.file.path,
          content: f.file.rootNode.text,
        });
      }
      for (const [k, v] of f.dependencies) {
        if (!filesToKeep.has(k)) {
          filesToKeep.set(k, {
            path: v.path,
            content: v.rootNode.text,
          });
        }
      }
    }
    return filesToKeep;
  }
}
