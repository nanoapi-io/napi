import { z } from "zod";
import path from "path";
import { localConfigSchema } from "../../config/localConfig.js";
import { ExtractedFilesMap } from "../types.js";
import {
  CSharpExtractor,
  ExtractedFile,
} from "../../languagePlugins/csharp/extractor/index.js";
import { DependencyManifest } from "../../manifest/dependencyManifest/types.js";

export function extractCSharpSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  const extractor = new CSharpExtractor(files, dependencyManifest);
  const symbols: string[] = [];
  const extractedFiles: ExtractedFile[] = [];
  for (const symbolSet of symbolsToExtract.values()) {
    symbols.push(...Array.from(symbolSet.symbols));
  }
  for (const symbol of symbols) {
    const extractedFile = extractor.extractSymbolByName(symbol);
    if (extractedFile) {
      extractedFiles.push(...extractedFile);
    }
  }
  const extractedFilesMap: ExtractedFilesMap = new Map();
  for (const extractedFile of extractedFiles) {
    const { subproject, namespace, name } = extractedFile;
    const key = path.join(subproject.name, namespace, name);
    if (!extractedFilesMap.has(key)) {
      extractedFilesMap.set(key, {
        path: key,
        content: extractor.getContent(extractedFile),
      });
    }
  }
  return extractedFilesMap;
}
