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
import { JavaDependencyFormatter } from "../../../languagePlugins/java/dependencyFormatting/index.ts";
// import { JavaMetricsAnalyzer } from "../../../languagePlugins/java/metrics/index.ts";
import { javaLanguage } from "../../../helpers/treeSitter/parsers.ts";

export function generateJavaDependencyManifest(
  files: Map<string, { path: string; content: string }>,
): DependencyManifest {
  console.time("generateJavaDependencyManifest");
  console.info("Processing project...");
  const formatter = new JavaDependencyFormatter(files);
  const manifest: DependencyManifest = {};
  const filecount = files.size;
  let i = 0;
  for (const [, { path }] of files) {
    console.info(`Processing ${path} (${++i}/${filecount})`);
    const fm = formatter.formatFile(path);
    const cSyms = fm.symbols;
    const symbols: Record<string, SymbolDependencyManifest> = {};
    for (const [symName, symbol] of Object.entries(cSyms)) {
      const symType = symbol.type;
      const dependencies = symbol.dependencies;
      symbols[symName] = {
        id: symName,
        type: symType as SymbolType,
        metrics: {
          [metricCharacterCount]: symbol.characterCount,
          [metricCodeCharacterCount]: 0, // TODO : metrics
          [metricLinesCount]: symbol.lineCount,
          [metricCodeLineCount]: 0, // TODO : metrics
          [metricDependencyCount]: Object.keys(dependencies).length,
          [metricDependentCount]: 0,
          [metricCyclomaticComplexity]: 0, // TODO : metrics
        },
        dependencies: dependencies,
        dependents: {},
      };
    }
    manifest[path] = {
      id: fm.id,
      filePath: fm.filePath,
      language: javaLanguage,
      metrics: {
        [metricCharacterCount]: fm.characterCount,
        [metricCodeCharacterCount]: 0, // TODO : metrics
        [metricLinesCount]: fm.lineCount,
        [metricCodeLineCount]: 0, // TODO : metrics
        [metricDependencyCount]: Object.keys(fm.dependencies).length,
        [metricDependentCount]: 0,
        [metricCyclomaticComplexity]: 0, // TODO : metrics
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
