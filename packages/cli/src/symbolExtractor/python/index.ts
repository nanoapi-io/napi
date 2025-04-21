import z from "zod";
import { localConfigSchema } from "../../config/localConfig.js";
import { ExtractedFilesMap } from "../types.js";
import Parser from "tree-sitter";
import { pythonParser } from "../../helpers/treeSitter/parsers.js";
import { DependencyManifest } from "../../manifest/dependencyManifest/types.js";
import { PythonExportExtractor } from "../../languagePlugins/python/exportExtractor/index.js";
import { PythonImportExtractor } from "../../languagePlugins/python/importExtractor/index.js";
import { PythonModuleResolver } from "../../languagePlugins/python/moduleResolver/index.js";
import { PythonItemResolver } from "../../languagePlugins/python/itemResolver/index.js";
import { PythonUsageResolver } from "../../languagePlugins/python/usageResolver/index.js";
import { PythonSymbolExtractor } from "../../languagePlugins/python/symbolExtractor/index.js";

export function extractPythonSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  const pythonVersion = napiConfig.python?.version;
  if (!pythonVersion) {
    throw new Error("Python version is required");
  }

  const parsedFiles = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  for (const { path, content } of files.values()) {
    const rootNode = pythonParser.parse(content, undefined, {
      bufferSize: content.length + 10,
    }).rootNode;
    parsedFiles.set(path, { path, rootNode });
  }

  const exportExtractor = new PythonExportExtractor(pythonParser, parsedFiles);
  const importExtractor = new PythonImportExtractor(pythonParser, parsedFiles);
  const moduleResolver = new PythonModuleResolver(
    new Set(parsedFiles.keys()),
    pythonVersion,
  );
  const itemResolver = new PythonItemResolver(
    exportExtractor,
    importExtractor,
    moduleResolver,
  );
  const usageResolver = new PythonUsageResolver(pythonParser, exportExtractor);
  const symbolExtractor = new PythonSymbolExtractor(
    pythonParser,
    parsedFiles,
    exportExtractor,
    importExtractor,
    moduleResolver,
    itemResolver,
    usageResolver,
    dependencyManifest,
  );

  const extractedFiles = symbolExtractor.extractSymbol(symbolsToExtract);

  return extractedFiles;
}
