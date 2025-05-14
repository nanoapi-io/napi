import { generatePythonDependencyManifest } from "./python/index.js";
import { generateCSharpDependencyManifest } from "./csharp/index.js";
import { generateCDependencyManifest } from "./c/index.js";
import { localConfigSchema } from "../../config/localConfig.js";
import z from "zod";
import {
  DependencyManifest,
  SymbolDependencyManifest,
} from "@nanoapi.io/shared";
import {
  pythonLanguage,
  csharpLanguage,
  cLanguage,
} from "../../helpers/treeSitter/parsers.js";

const handlerMap: Record<
  string,
  (
    files: Map<string, { path: string; content: string }>,
    napiConfig: z.infer<typeof localConfigSchema>,
  ) => DependencyManifest
> = {
  [pythonLanguage]: generatePythonDependencyManifest,
  [csharpLanguage]: generateCSharpDependencyManifest,
  [cLanguage]: generateCDependencyManifest,
};

export class UnsupportedLanguageError extends Error {
  constructor(language: string) {
    const supportedLanguages = Object.keys(handlerMap).join(", ");
    super(
      `Unsupported language: ${language}. Supported languages: ${supportedLanguages}`,
    );
  }
}

export function generateDependencyManifest(
  files: Map<string, { path: string; content: string }>,
  napiConfig: z.infer<typeof localConfigSchema>,
): DependencyManifest {
  const languageName = napiConfig.language;

  const handler = handlerMap[languageName];
  if (!handler) {
    throw new UnsupportedLanguageError(languageName);
  }

  const depMap = handler(files, napiConfig);

  // Sort the keys of the dependency map and consider them all as lowercase
  const sortedKeys = Object.keys(depMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  // Create a new object with sorted keys
  const sortedDepMap: DependencyManifest = {};
  for (const key of sortedKeys) {
    sortedDepMap[key] = depMap[key];

    // Sort the symbols within each file manifest and consider them all as lowercase
    const sortedSymbols = Object.keys(depMap[key].symbols).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    // Then put the symbols in a new object with sorted keys
    // in their original case
    const sortedSymbolsMap: Record<string, SymbolDependencyManifest> = {};
    for (const symbolKey of sortedSymbols) {
      sortedSymbolsMap[symbolKey] = depMap[key].symbols[symbolKey];
    }
    // Assign the sorted symbols back to the file manifest
    sortedDepMap[key].symbols = sortedSymbolsMap;
  }

  return sortedDepMap;
}
