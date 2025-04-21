import { ExtractedFilesMap } from "./types.js";
import { extractPythonSymbols } from "./python/index.js";
import { localConfigSchema } from "../config/localConfig.js";
import z from "zod";
import { DependencyManifest } from "../manifest/dependencyManifest/types.js";

const handlerMap: Record<
  string,
  (
    files: Map<string, { path: string; content: string }>,
    dependencyManifest: DependencyManifest,
    symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
    napiConfig: z.infer<typeof localConfigSchema>,
  ) => ExtractedFilesMap
> = {
  python: extractPythonSymbols,
};

export class UnsupportedLanguageError extends Error {
  constructor(language: string) {
    const supportedLanguages = Object.keys(handlerMap).join(", ");
    super(
      `Unsupported language: ${language}. Supported languages: ${supportedLanguages}`,
    );
  }
}

export function extractSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  const languageName = napiConfig.language;
  const handler = handlerMap[languageName];
  if (!handler) {
    throw new UnsupportedLanguageError(languageName);
  }

  const extractedFiles = handler(
    files,
    dependencyManifest,
    symbolsToExtract,
    napiConfig,
  );

  return extractedFiles;
}
