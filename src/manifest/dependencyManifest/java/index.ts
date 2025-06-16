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
import { JavaDependencyFormatter } from "../../../languagePlugins/java/dependencyFormatting/index.ts";
// import { JavaMetricsAnalyzer } from "../../../languagePlugins/java/metrics/index.ts";
import { javaLanguage } from "../../../helpers/treeSitter/parsers.ts";
import { JavaMetricsAnalyzer } from "../../../languagePlugins/java/metrics/index.ts";

export function generateJavaDependencyManifest(
  files: Map<string, { path: string; content: string }>,
): DependencyManifest {
  console.time("generateJavaDependencyManifest");
  console.info("Processing project...");
  const formatter = new JavaDependencyFormatter(files);
  const metricsAnalyzer = new JavaMetricsAnalyzer();
  const manifest: DependencyManifest = {};
  const newfiles = formatter.mapper.files;
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
      language: javaLanguage,
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
  console.timeEnd("generateJavaDependencyManifest");
  return manifest;
}
