import { generatePythonDependencyManifest } from "./python/index.ts";
import { generateCSharpDependencyManifest } from "./csharp/index.ts";
import { generateCDependencyManifest } from "./c/index.ts";
import type { localConfigSchema } from "../../cli/middlewares/napiConfig.ts";
import type z from "zod";
import type { DependencyManifest, SymbolDependencyManifest } from "./types.ts";
import {
  cLanguage,
  csharpLanguage,
  javaLanguage,
  pythonLanguage,
} from "../../helpers/treeSitter/parsers.ts";
import { generateJavaDependencyManifest } from "./java/index.ts";
import { generateSymbolDescriptions } from "./labeling/index.ts";
import type { globalConfigSchema } from "../../cli/middlewares/globalConfig.ts";
import {
  ANTHROPIC_PROVIDER,
  GOOGLE_PROVIDER,
  OPENAI_PROVIDER,
} from "./labeling/model.ts";

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
  [javaLanguage]: generateJavaDependencyManifest,
};

export class UnsupportedLanguageError extends Error {
  constructor(language: string) {
    const supportedLanguages = Object.keys(handlerMap).join(", ");
    super(
      `Unsupported language: ${language}. Supported languages: ${supportedLanguages}`,
    );
  }
}

export async function generateDependencyManifest(
  files: Map<string, { path: string; content: string }>,
  napiConfig: z.infer<typeof localConfigSchema>,
  globalConfig: z.infer<typeof globalConfigSchema>,
  labelingApiKey: string | undefined,
): Promise<DependencyManifest> {
  const languageName = napiConfig.language;

  const handler = handlerMap[languageName];
  if (!handler) {
    throw new UnsupportedLanguageError(languageName);
  }

  const depMap = handler(files, napiConfig);

  // Sort the keys of the dependency map and consider them all as lowercase
  const sortedKeys = Object.keys(depMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  // Create a new object with sorted keys
  const sortedDepMap: DependencyManifest = {};
  for (const key of sortedKeys) {
    sortedDepMap[key] = depMap[key];

    // Sort the symbols within each file manifest and consider them all as lowercase
    const sortedSymbols = Object.keys(depMap[key].symbols).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
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

  if (napiConfig.labeling) {
    let apiKey: string | undefined;
    if (labelingApiKey) {
      apiKey = labelingApiKey;
    } else {
      if (napiConfig.labeling.modelProvider === GOOGLE_PROVIDER) {
        apiKey = globalConfig.labeling?.apiKeys.google;
      }
      if (napiConfig.labeling.modelProvider === OPENAI_PROVIDER) {
        apiKey = globalConfig.labeling?.apiKeys.openai;
      }
      if (napiConfig.labeling.modelProvider === ANTHROPIC_PROVIDER) {
        apiKey = globalConfig.labeling?.apiKeys.anthropic;
      }
    }

    if (!apiKey) {
      console.warn(
        "No API key found for the selected model provider. Please run `napi set apiKey` to set an API key.",
      );
      return sortedDepMap;
    }

    const labeledDependencyManifest = await generateSymbolDescriptions(
      files,
      sortedDepMap,
      apiKey,
      napiConfig.labeling.modelProvider,
      napiConfig.labeling.maxConcurrency,
    );

    return labeledDependencyManifest;
  } else {
    return sortedDepMap;
  }
}
