import type Parser from "tree-sitter";
import type { DependencyManifest } from "../../../manifest/dependencyManifest/types.ts";
import { JavaInvocationResolver } from "../invocationResolver/index.ts";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";
import { JavaPackageMapper } from "../packageMapper/index.ts";
import { JavaImportResolver } from "../importResolver/index.ts";
import { ExportedFile } from "./types.ts";

export class JavaExtractor {
  manifest: DependencyManifest;
  resolver: JavaInvocationResolver;
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
