import type { ExtractedFilesMap } from "../types.ts";
import { CExtractor } from "../../languagePlugins/c/extractor/index.ts";
import type { DependencyManifest } from "../../manifest/dependencyManifest/types.ts";
import type { z } from "zod";
import type { localConfigSchema } from "../../cli/middlewares/napiConfig.ts";

export function extractCSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  _napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  console.time(`Extracted ${symbolsToExtract.size} symbol(s)`);
  const extractor = new CExtractor(files, dependencyManifest, _napiConfig);
  const extractedFiles = extractor.extractSymbols(symbolsToExtract);
  console.timeEnd(`Extracted ${symbolsToExtract.size} symbol(s)`);
  return extractedFiles;
}
