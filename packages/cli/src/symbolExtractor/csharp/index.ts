import type { z } from "zod";
import { join, SEPARATOR } from "@std/path";
import type { localConfigSchema } from "../../cli/middlewares/napiConfig.ts";
import type { ExtractedFilesMap } from "../types.ts";
import {
  CSharpExtractor,
  type ExtractedFile,
} from "../../languagePlugins/csharp/extractor/index.ts";
import type { DependencyManifest } from "../../manifest/dependencyManifest/types.ts";
import type { DotNetProject } from "../../languagePlugins/csharp/projectMapper/index.ts";
import type Parser from "tree-sitter";
import { csharpParser } from "../../helpers/treeSitter/parsers.ts";
import { CSharpNamespaceMapper } from "../../languagePlugins/csharp/namespaceMapper/index.ts";
import { CSharpProjectMapper } from "../../languagePlugins/csharp/projectMapper/index.ts";
import {
  CSharpUsingResolver,
  ExternalSymbol,
  InternalSymbol,
} from "../../languagePlugins/csharp/usingResolver/index.ts";
import { CSharpInvocationResolver } from "../../languagePlugins/csharp/invocationResolver/index.ts";

/**
 * Extracts C# symbols from the given files.
 * @param files - A map of file paths to their content.
 * @param dependencyManifest - The dependency manifest.
 * @param symbolsToExtract - A map of symbols to extract, where the key is the symbol name and the value is an object containing the file path and a set of symbols.
 * @param _napiConfig - The NAPI configuration.
 * @returns - A map of extracted files, where the key is the file path and the value is an object containing the file path and content.
 */
export function extractCSharpSymbols(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  symbolsToExtract: Map<string, { filePath: string; symbols: Set<string> }>,
  _napiConfig: z.infer<typeof localConfigSchema>,
): ExtractedFilesMap {
  console.time(`Extracted ${symbolsToExtract.size} symbol(s)`);
  const extractor = new CSharpExtractor(files, dependencyManifest);
  const extractedFiles: ExtractedFile[] = [];
  const parsedFiles = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  const csprojFiles = new Map<string, { path: string; content: string }>();
  // Extract symbols from the files
  for (const symbolSet of symbolsToExtract.values()) {
    for (const symbol of symbolSet.symbols) {
      const extractedFile = extractor.extractSymbolFromFile(
        symbolSet.filePath,
        symbol,
      );
      if (extractedFile) {
        // Add the extracted file to the list of extracted files
        extractedFiles.push(...extractedFile);
        // Add the extracted file to the parsed files map
        // This is used to create a representation of the exported project
        // It will help us to find which namespaces cannot be used in using directives anymore
        for (const file of extractedFile) {
          const filePath = file.name;
          if (!parsedFiles.has(filePath)) {
            parsedFiles.set(filePath, {
              path: filePath,
              rootNode: csharpParser.parse(extractor.getContent(file)).rootNode,
            });
          }
          // Add the csproj file to the csproj files map
          const subproject = file.subproject;
          if (!csprojFiles.has(subproject.csprojPath)) {
            csprojFiles.set(subproject.csprojPath, {
              path: subproject.csprojPath,
              content: subproject.csprojContent,
            });
            const globalUsingsPath = join(
              subproject.rootFolder,
              "GlobalUsings.cs",
            );
            const globalUsingsContent = extractor.generateGlobalUsings(
              subproject,
            );
            if (!parsedFiles.has(globalUsingsPath)) {
              parsedFiles.set(globalUsingsPath, {
                path: globalUsingsPath,
                rootNode: csharpParser.parse(globalUsingsContent).rootNode,
              });
            }
          }
        }
      }
    }
  }
  // For each extracted file, check if the using directives are still valid and useful
  const nsMapper = new CSharpNamespaceMapper(parsedFiles);
  const pjMapper = new CSharpProjectMapper(csprojFiles);
  const usingResolver = new CSharpUsingResolver(nsMapper, pjMapper);
  const invocationResolver = new CSharpInvocationResolver(nsMapper, pjMapper);
  for (const extractedFile of extractedFiles) {
    const imports = extractedFile.imports;
    const invocations = invocationResolver.getInvocationsFromFile(
      extractedFile.name,
    );
    for (const importDirective of imports) {
      const resolvedInNewFile = usingResolver.resolveUsingDirective(
        importDirective,
      );
      const resolvedInOldFile = extractor.usingResolver.resolveUsingDirective(
        importDirective,
      );
      if (
        (resolvedInNewFile instanceof ExternalSymbol &&
          resolvedInOldFile instanceof InternalSymbol) ||
        !invocationResolver.isUsingUseful(invocations, importDirective)
      ) {
        extractedFile.imports = extractedFile.imports.filter(
          (imp) => imp !== importDirective,
        );
      }
    }
  }
  // Actually extract the files
  const subprojects: DotNetProject[] = [];
  const extractedFilesMap: ExtractedFilesMap = new Map();
  for (const extractedFile of extractedFiles) {
    const { subproject, namespace, name } = extractedFile;
    if (!subprojects.includes(subproject)) {
      subprojects.push(subproject);
    }
    // File path for the extracted file
    const fakeprojectpath = subproject.name.split(".").join(SEPARATOR);
    const spindex = namespace.split(".").indexOf(subproject.name);
    const nspath = namespace
      .split(".")
      .slice(spindex !== -1 ? spindex : 0)
      .join(SEPARATOR)
      .replace(fakeprojectpath, subproject.name);
    const key = join(
      spindex !== -1 || nspath.startsWith(subproject.name)
        ? ""
        : subproject.name,
      nspath,
      `${name}.cs`,
    );
    if (!extractedFilesMap.has(key)) {
      const filecontent = extractor.getContent(extractedFile);
      // Add the extracted file to the output map
      extractedFilesMap.set(key, {
        path: key,
        content: filecontent,
      });
    }
  }
  // Add the .csproj and GlobalUsings.cs files for each subproject
  for (const subproject of subprojects) {
    const projectPath = join(subproject.name, `${subproject.name}.csproj`);
    const globalUsingPath = join(subproject.name, "GlobalUsings.cs");
    if (!extractedFilesMap.has(projectPath)) {
      // Add the project files to the output map
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
