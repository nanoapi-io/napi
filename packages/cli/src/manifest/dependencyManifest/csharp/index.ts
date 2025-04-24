import {
  DependencyManifest,
  SymbolDependencyManifest,
  SymbolType,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@nanoapi.io/shared";
import {
  CSharpDependencyFormatter,
  CSharpFile,
} from "../../../languagePlugins/csharp/dependencyFormatting/index.js";
import Parser from "tree-sitter";
import {
  csharpLanguage,
  csharpParser,
} from "../../../helpers/treeSitter/parsers.js";

/**
 * Generates a dependency manifest for C# files.
 * @param files - A map of file paths to their corresponding syntax nodes.
 * @returns A dependency manifest for the C# files.
 */
export function generateCSharpDependencyManifest(
  files: Map<string, { path: string; content: string }>,
): DependencyManifest {
  console.time("generateCSharpDependencyManifest");
  console.info("Processing project...");
  const parsedFiles = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  const csprojFiles = new Map<string, { path: string; content: string }>();

  // Filter out csproj files and parse C# files
  for (const [filePath, { content: fileContent }] of files) {
    if (filePath.endsWith(".csproj")) {
      csprojFiles.set(filePath, { path: filePath, content: fileContent });
    } else {
      try {
        const rootNode = csharpParser.parse(fileContent, undefined, {
          bufferSize: fileContent.length + 10,
        }).rootNode;
        parsedFiles.set(filePath, { path: filePath, rootNode });
      } catch (e) {
        console.error(`Failed to parse ${filePath}, skipping`);
        console.error(e);
      }
    }
  }

  const formatter = new CSharpDependencyFormatter(parsedFiles, csprojFiles);
  const manifest: DependencyManifest = {};
  const filecount = parsedFiles.size;
  let i = 0;
  for (const [, { path }] of parsedFiles) {
    console.info(`Processing ${path} (${++i}/${filecount})`);
    const fm = formatter.formatFile(path) as CSharpFile;
    const csharpSyms = fm.symbols;
    const symbols: Record<string, SymbolDependencyManifest> = {};
    for (const [symbolName, symbol] of Object.entries(csharpSyms)) {
      symbols[symbolName] = {
        id: symbolName,
        type: symbol.type as SymbolType,
        metrics: {
          [metricCharacterCount]: symbol.characterCount,
          [metricCodeCharacterCount]: 0, // TODO: fix this
          [metricLinesCount]: symbol.lineCount,
          [metricCodeLineCount]: 0, // TODO: fix this
          [metricDependencyCount]: 0, // TODO: fix this
          [metricDependentCount]: 0, // TODO: fix this
          [metricCyclomaticComplexity]: 0, // TODO: fix this
        },
        dependencies: symbol.dependencies,
        dependents: {},
      };
    }
    manifest[path] = {
      id: fm.id,
      filePath: fm.filepath,
      language: csharpLanguage,
      metrics: {
        [metricCharacterCount]: fm.characterCount,
        [metricCodeCharacterCount]: 0, // TODO: fix this
        [metricLinesCount]: fm.lineCount,
        [metricCodeLineCount]: 0, // TODO: fix this
        [metricDependencyCount]: 0, // TODO: fix this
        [metricDependentCount]: 0, // TODO: fix this
        [metricCyclomaticComplexity]: 0, // TODO: fix this
      },
      dependencies: fm.dependencies,
      symbols,
      dependents: {}, //TODO fix this
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
