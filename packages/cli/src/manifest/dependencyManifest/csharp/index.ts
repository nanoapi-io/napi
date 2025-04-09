import { DependencyManifest, Symbol } from "..";
import {
  CSharpDependencyFormatter,
  CSharpFile,
} from "../../../languagePlugins/csharp/dependencyFormatting";
import Parser from "tree-sitter";

/**
 * Generates a dependency manifest for C# files.
 * @param files - A map of file paths to their corresponding syntax nodes.
 * @returns A dependency manifest for the C# files.
 */
export function generateCSharpDependencyManifest(
  files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
): DependencyManifest {
  console.time("generateCSharpDependencyManifest");
  console.info("Processing project...");
  const formatter = new CSharpDependencyFormatter(files);
  const manifest: DependencyManifest = {};
  const filecount = files.size;
  let i = 0;
  for (const [, { path }] of files) {
    console.info(`Processing ${path} (${++i}/${filecount})`);
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
    // Delete isNamespace from dependencies
    for (const dep of Object.values(fm.dependencies)) {
      delete dep.isNamespace;
    }
  }
  console.info("Populating dependents...");
  i = 0;
  // Populate dependents
  for (const fm of Object.values(manifest)) {
    const path = fm.filePath;
    console.info(`Populating dependents for ${path} (${++i}/${filecount})`);
    for (const symbol of Object.values(fm.symbols)) {
      for (const dpncy of Object.values(symbol.dependencies)) {
        for (const depsymbol of Object.values(dpncy.symbols)) {
          const otherFile = manifest[dpncy.id];
          const otherSymbol = otherFile.symbols[depsymbol];
          if (!otherSymbol.dependents[fm.id]) {
            otherSymbol.dependents[fm.id] = {
              id: fm.id,
              symbols: {},
            };
          }
          otherSymbol.dependents[fm.id].symbols[symbol.id] = symbol.id;
        }
      }
    }
  }
  console.timeEnd("generateCSharpDependencyManifest");
  return manifest;
}
