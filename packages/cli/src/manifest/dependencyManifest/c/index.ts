import {
  type DependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
  type SymbolDependencyManifest,
  type SymbolType,
} from "@napi/shared";
import { CDependencyFormatter } from "../../../languagePlugins/c/dependencyFormatting/index.ts";
import { CMetricsAnalyzer } from "../../../languagePlugins/c/metrics/index.ts";
import type Parser from "tree-sitter";
import { cLanguage, cParser } from "../../../helpers/treeSitter/parsers.ts";
import { CWarningManager } from "../../../languagePlugins/c/warnings/index.ts";

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

  const warningManager = new CWarningManager(parsedFiles);
  if (warningManager.diagnostics.length > 0) {
    console.warn(`⚠️ ${warningManager.diagnostics.length} warnings found:`);
    for (const warning of warningManager.diagnostics) {
      console.warn(warning.message);
    }
  }
  const formatter = new CDependencyFormatter(parsedFiles);
  const metricsAnalyzer = new CMetricsAnalyzer();
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
      const dependencies = symbol.dependencies;
      const metrics = metricsAnalyzer.analyzeNode(symbol.node);
      symbols[symName] = {
        id: symName,
        type: symType as SymbolType,
        metrics: {
          [metricCharacterCount]: metrics.characterCount,
          [metricCodeCharacterCount]: metrics.codeCharacterCount,
          [metricLinesCount]: metrics.linesCount,
          [metricCodeLineCount]: metrics.codeLinesCount,
          [metricDependencyCount]: Object.keys(dependencies).length,
          [metricDependentCount]: 0,
          [metricCyclomaticComplexity]: metrics.cyclomaticComplexity,
        },
        dependencies: dependencies,
        dependents: {},
      };
    }
    const metrics = metricsAnalyzer.analyzeNode(fm.rootNode);
    manifest[path] = {
      id: fm.id,
      filePath: fm.filePath,
      language: cLanguage,
      metrics: {
        [metricCharacterCount]: metrics.characterCount,
        [metricCodeCharacterCount]: metrics.codeCharacterCount,
        [metricLinesCount]: metrics.linesCount,
        [metricCodeLineCount]: metrics.codeLinesCount,
        [metricDependencyCount]: Object.keys(fm.dependencies).length,
        [metricDependentCount]: 0,
        [metricCyclomaticComplexity]: metrics.cyclomaticComplexity,
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
