import { DependencyManifesto, Symbol } from "..";
import {
  CSharpDependencyFormatter,
  CSharpFile,
} from "../../../languagePlugins/csharp/dependencyFormatting";
import Parser from "tree-sitter";

export function generateCSharpDependencyManifesto(
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
): DependencyManifesto {
  console.time("generateCSharpDependencyManifesto");
  const formatter = new CSharpDependencyFormatter(files);
  const manifesto: DependencyManifesto = {};
  for (const [, { path }] of files) {
    const fm = formatter.formatFile(path) as CSharpFile;
    manifesto[path] = {
      id: fm.id,
      filePath: fm.filepath,
      language: "csharp",
      characterCount: fm.characterCount,
      lineCount: fm.lineCount,
      dependencies: fm.dependencies,
      symbols: fm.symbols as unknown as Record<string, Symbol>,
    };
  }
  console.timeEnd("generateCSharpDependencyManifesto");
  return manifesto;
}
