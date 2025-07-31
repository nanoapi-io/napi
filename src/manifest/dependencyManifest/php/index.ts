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
} from "../types.ts";
import { PHPDependencyFormatter } from "../../../languagePlugins/php/dependencyFormatting/index.ts";
import { phpLanguage } from "../../../helpers/treeSitter/parsers.ts";

export function generateJavaDependencyManifest(
  files: Map<string, { path: string; content: string }>,
): DependencyManifest {
  console.time("generateJavaDependencyManifest");
  console.info("Processing project...");
  const formatter = new PHPDependencyFormatter(files);
  const manifest: DependencyManifest = {};
  const newfiles = formatter.registree.registry.files;
  const filecount = newfiles.size;
  let i = 0;
  for (const [, { path }] of newfiles) {
    console.info(`Processing ${path} (${++i}/${filecount})`);
    const fm = formatter.formatFile(path);
    const cSyms = fm.symbols;
    const symbols: Record<string, SymbolDependencyManifest> = {};
    for (const [symName, symbol] of Object.entries(cSyms)) {
      const symType = symbol.type;
      const dependencies = symbol.dependencies;
      // const metrics = metricsAnalyzer.analyzeNode(symbol.node);
      symbols[symName] = {
        id: symName,
        type: symType as SymbolType,
        metrics: {
          [metricCharacterCount]: 0, // metrics.characterCount,
          [metricCodeCharacterCount]: 0, // metrics.codeCharacterCount,
          [metricLinesCount]: 0, // metrics.linesCount,
          [metricCodeLineCount]: 0, // metrics.codeLinesCount,
          [metricDependencyCount]: Object.keys(dependencies).length,
          [metricDependentCount]: 0,
          [metricCyclomaticComplexity]: 0, // metrics.cyclomaticComplexity,
        },
        dependencies: dependencies,
        dependents: {},
      };
    }
    // const metrics = metricsAnalyzer.analyzeNode(fm.rootNode);
    manifest[path] = {
      id: fm.id,
      filePath: fm.filePath,
      language: phpLanguage,
      metrics: {
        [metricCharacterCount]: 0, // metrics.characterCount,
        [metricCodeCharacterCount]: 0, // metrics.codeCharacterCount,
        [metricLinesCount]: 0, // metrics.linesCount,
        [metricCodeLineCount]: 0, // metrics.codeLinesCount,
        [metricDependencyCount]: Object.keys(fm.dependencies).length,
        [metricDependentCount]: 0,
        [metricCyclomaticComplexity]: 0, // metrics.cyclomaticComplexity,
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
  console.timeEnd("generateJavaDependencyManifest");
  return manifest;
}
