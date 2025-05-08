import {
  DependencyManifest,
  metricLinesCount,
  metricCharacterCount,
  metricCodeLineCount,
  metricCodeCharacterCount,
  metricDependencyCount,
  metricDependentCount,
  metricCyclomaticComplexity,
  SymbolDependencyManifest,
  SymbolType,
} from "@nanoapi.io/shared";
import { CDependencyFormatter } from "../../../languagePlugins/c/dependencyFormatting/index.js";
import Parser from "tree-sitter";
import { cLanguage, cParser } from "../../../helpers/treeSitter/parsers.js";

export function generateCDependencyManifest(
  files: Map<string, { path: string; content: string }>,
): DependencyManifest {
  console.time("generateCDependencyManifest");
  console.info("Processing project...");
  const parsedFiles = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  for (const [filePath, { content: fileContent }] of files) {
    try {
      const rootNode = cParser.parse(fileContent, undefined, {
        bufferSize: fileContent.length + 10,
      }).rootNode;
      parsedFiles.set(filePath, { path: filePath, rootNode });
    } catch (e) {
      console.error(`Failed to parse ${filePath}, skipping`);
      console.error(e);
    }
  }

  const formatter = new CDependencyFormatter(parsedFiles);
  const manifest: DependencyManifest = {};
  const filecount = parsedFiles.size;
  let i = 0;
  for (const [, { path }] of parsedFiles) {
    console.info(`Processing ${path} (${++i}/${filecount})`);
    const fm = formatter.formatFile(path);
    const cSyms = fm.symbols;
    const symbols: Record<string, SymbolDependencyManifest> = {};
    for (const [symName, symbol] of Object.entries(cSyms)) {
      const symType = symbol.type;
      const lineCount = symbol.lineCount;
      const characterCount = symbol.characterCount;
      const dependencies = symbol.dependencies;
      // TODO : metrics
      symbols[symName] = {
        id: symName,
        type: symType as SymbolType,
        metrics: {
          [metricCharacterCount]: characterCount,
          [metricCodeCharacterCount]: 0, // TODO: fix this
          [metricLinesCount]: lineCount,
          [metricCodeLineCount]: 0, // TODO: fix this
          [metricDependencyCount]: Object.keys(dependencies).length,
          [metricDependentCount]: 0,
          [metricCyclomaticComplexity]: 0, // TODO: fix this
        },
        dependencies: dependencies,
        dependents: {},
      };
    }
    // TODO : metrics
    manifest[path] = {
      id: fm.id,
      filePath: fm.filePath,
      language: cLanguage,
      metrics: {
        [metricCharacterCount]: fm.characterCount,
        [metricCodeCharacterCount]: 0, // TODO: fix this
        [metricLinesCount]: fm.lineCount,
        [metricCodeLineCount]: 0, // TODO: fix this
        [metricDependencyCount]: Object.keys(fm.dependencies).length,
        [metricDependentCount]: 0,
        [metricCyclomaticComplexity]: 0, // TODO: fix this
      },
      dependencies: fm.dependencies,
      symbols: symbols,
      dependents: {},
    };
  }
  console.info("Populating dependents...");
  i = 0;
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
          fm.metrics[metricDependentCount]++;
          symbol.metrics[metricDependentCount]++;
        }
      }
    }
  }
  console.timeEnd("generateCDependencyManifest");
  return manifest;
}
