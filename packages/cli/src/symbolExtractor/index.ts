import type { ExtractedFilesMap } from "./types.ts";
import { extractPythonSymbols } from "./python/index.ts";
import { extractCSharpSymbols } from "./csharp/index.ts";
import { extractCSymbols } from "./c/index.ts";
import type { localConfigSchema } from "../config/localConfig.ts";
import type z from "npm:zod";
import type { DependencyManifest } from "@napi/shared";

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
  "c-sharp": extractCSharpSymbols,
  c: extractCSymbols,
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
