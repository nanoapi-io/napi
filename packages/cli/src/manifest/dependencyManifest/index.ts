import { generatePythonDependencyManifest } from "./python/index.ts";
import { generateCSharpDependencyManifest } from "./csharp/index.ts";
import { generateCDependencyManifest } from "./c/index.ts";
import type { localConfigSchema } from "../../config/localConfig.ts";
import type z from "npm:zod";
import type {
  DependencyManifest,
  SymbolDependencyManifest,
} from "@napi/shared";
import {
  cLanguage,
  csharpLanguage,
  pythonLanguage,
} from "../../helpers/treeSitter/parsers.ts";
import { join } from "@std/path";

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

  return sortedDepMap;
}

export function getDependencyManifestPath(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  return join(workDir, napiConfig.outDir, "napi-manifest.json");
}

export function dependencyManifestExists(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const manifestPath = getDependencyManifestPath(workDir, napiConfig);
  try {
    const stat = Deno.statSync(manifestPath);
    return stat.isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

export function getDependencyManifest(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
): DependencyManifest {
  const manifestPath = getDependencyManifestPath(workDir, napiConfig);

  const manifest = JSON.parse(
    Deno.readTextFileSync(manifestPath),
  ) as DependencyManifest;
  return manifest;
}
