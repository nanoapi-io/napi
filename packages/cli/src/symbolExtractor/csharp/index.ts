import { z } from "zod";
import path from "path";
import { localConfigSchema } from "../../config/localConfig.js";
import { ExtractedFilesMap } from "../types.js";
import {
  CSharpExtractor,
  ExtractedFile,
} from "../../languagePlugins/csharp/extractor/index.js";
import { DependencyManifest } from "@nanoapi.io/shared";
import { DotNetProject } from "../../languagePlugins/csharp/projectMapper/index.js";

export function extractCSharpSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  console.time(`Extracted ${symbolsToExtract.size} symbol(s)`);
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
  const subprojects: DotNetProject[] = [];
  const extractedFilesMap: ExtractedFilesMap = new Map();
  for (const extractedFile of extractedFiles) {
    const { subproject, namespace, name } = extractedFile;
    if (!subprojects.includes(subproject)) {
      subprojects.push(subproject);
    }
    const key = path.join(subproject.name, namespace, `${name}.cs`);
    if (!extractedFilesMap.has(key)) {
      extractedFilesMap.set(key, {
        path: key,
        content: extractor.getContent(extractedFile),
      });
    }
  }
  for (const subproject of subprojects) {
    const projectPath = path.join(subproject.name, `${subproject.name}.csproj`);
    const globalUsingPath = path.join(subproject.name, "GlobalUsings.cs");
    if (!extractedFilesMap.has(projectPath)) {
      extractedFilesMap.set(projectPath, {
        path: projectPath,
        content: subproject.csprojContent,
      });
      extractedFilesMap.set(globalUsingPath, {
        path: globalUsingPath,
        content: extractor.generateGlobalUsings(subproject),
      });
    }
  }
  console.timeEnd(`Extracted ${symbolsToExtract.size} symbol(s)`);
  return extractedFilesMap;
}
