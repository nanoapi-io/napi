import { DependencyManifest, Symbol } from "..";
import {
  CSharpDependencyFormatter,
  CSharpFile,
} from "../../../languagePlugins/csharp/dependencyFormatting";
import Parser from "tree-sitter";

export function generateCSharpDependencyManifest(
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
): DependencyManifest {
  console.time("generateCSharpDependencyManifest");
  const formatter = new CSharpDependencyFormatter(files);
  const manifest: DependencyManifest = {};
  for (const [, { path }] of files) {
    const fm = formatter.formatFile(path) as CSharpFile;
    manifest[path] = {
      id: fm.id,
      filePath: fm.filepath,
      language: "c-sharp",
      characterCount: fm.characterCount,
      lineCount: fm.lineCount,
      dependencies: fm.dependencies,
      symbols: fm.symbols as unknown as Record<string, Symbol>,
    };
  }
  // Populate dependents
  for (const [, { path }] of files) {
    const fm = manifest[path];
    for (const symbol of Object.values(fm.symbols)) {
      for (const [, dep] of Object.entries(symbol.dependents)) {
        const depManifest = manifest[dep.id];
        if (depManifest) {
          depManifest.symbols[dep.symbols[symbol.id]] = symbol;
        }
      }
    }
  }
  console.timeEnd("generateCSharpDependencyManifest");
  return manifest;
}
