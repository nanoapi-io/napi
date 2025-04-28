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

/**
 * Extracts C# symbols from the given files.
 * @param files - A map of file paths to their content.
 * @param dependencyManifest - The dependency manifest.
 * @param symbolsToExtract - A map of symbols to extract, where the key is the symbol name and the value is an object containing the file path and a set of symbols.
 * @param napiConfig - The NAPI configuration.
 * @returns - A map of extracted files, where the key is the file path and the value is an object containing the file path and content.
 */
export function extractCSharpSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  console.time(`Extracted ${symbolsToExtract.size} symbol(s)`);
  const extractor = new CSharpExtractor(files, dependencyManifest);
  const extractedFiles: ExtractedFile[] = [];
  // Extract symbols from the files
  for (const symbolSet of symbolsToExtract.values()) {
    for (const symbol of symbolSet.symbols) {
      const extractedFile = extractor.extractSymbolFromFile(
        symbolSet.filePath,
        symbol,
      );
      if (extractedFile) {
        extractedFiles.push(...extractedFile);
      }
    }
  }
  const subprojects: DotNetProject[] = [];
  const extractedFilesMap: ExtractedFilesMap = new Map();
  for (const extractedFile of extractedFiles) {
    const { subproject, namespace, name } = extractedFile;
    if (!subprojects.includes(subproject)) {
      subprojects.push(subproject);
    }
    // File path for the extracted file
    const fakeprojectpath = subproject.name.split(".").join(path.sep);
    const spindex = namespace.split(".").indexOf(subproject.name);
    const key = path.join(
      spindex !== -1 ? "" : subproject.name,
      namespace
        .split(".")
        .slice(spindex !== -1 ? spindex : 0)
        .join(path.sep)
        .replace(fakeprojectpath, subproject.name),
      `${name}.cs`,
    );
    if (!extractedFilesMap.has(key)) {
      extractedFilesMap.set(key, {
        path: key,
        content: extractor.getContent(extractedFile),
      });
    }
  }
  // Add the .csproj and GlobalUsings.cs files for each subproject
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
