import Parser from "tree-sitter";
import {
  cleanupJavascriptAnnotations,
  cleanupJavascriptInvalidImports,
  cleanupUnusedJavascriptImports,
} from "./languages/javascript/cleanup";
import { getJavascriptImports } from "./languages/javascript/imports";

import { resolveFilePath } from "./file";
import { Group } from "./types";
import { getParserLanguageFromFile } from "./treeSitter";
import { getJavascriptExports } from "./languages/javascript/exports";
import assert from "assert";
import {
  cleanupTypescriptAnnotations,
  cleanupTypescriptInvalidImports,
  cleanupUnusedTypescriptImports,
} from "./languages/typescript/cleanup";
import { getTypescriptExports } from "./languages/typescript/exports";
import { getTypescriptImports } from "./languages/typescript/imports";

export function cleanupAnnotations(
  filePath: string,
  sourceCode: string,
  group: Group,
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  let updatedSourceCode: string;

  if (language.name === "javascript") {
    updatedSourceCode = cleanupJavascriptAnnotations(parser, sourceCode, group);
  } else if (language.name === "typescript") {
    updatedSourceCode = cleanupTypescriptAnnotations(parser, sourceCode, group);
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  return updatedSourceCode;
}

export function getExportMap(files: { path: string; sourceCode: string }[]) {
  const exportIdentifiersMap = new Map<
    string,
    {
      namedExports: {
        exportNode: Parser.SyntaxNode;
        identifierNode: Parser.SyntaxNode;
      }[];
      defaultExport?: Parser.SyntaxNode;
    }
  >();
  files.forEach((file) => {
    const language = getParserLanguageFromFile(file.path);
    const parser = new Parser();
    parser.setLanguage(language);

    const tree = parser.parse(file.sourceCode);

    if (language.name === "javascript") {
      const exports = getJavascriptExports(parser, tree.rootNode);
      exportIdentifiersMap.set(file.path, exports);
    } else if (language.name === "typescript") {
      const exports = getTypescriptExports(parser, tree.rootNode);
      exportIdentifiersMap.set(file.path, exports);
    } else {
      throw new Error(`Unsupported language: ${language.language}`);
    }
  });

  return exportIdentifiersMap;
}

export function cleanupInvalidImports(
  filePath: string,
  sourceCode: string,
  exportIdentifiersMap: Map<
    string,
    {
      namedExports: {
        exportNode: Parser.SyntaxNode;
        identifierNode: Parser.SyntaxNode;
      }[];
      defaultExport?: Parser.SyntaxNode;
    }
  >,
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  let updatedSourceCode: string = sourceCode;

  if (language.name === "javascript") {
    updatedSourceCode = cleanupJavascriptInvalidImports(
      parser,
      filePath,
      sourceCode,
      exportIdentifiersMap,
    );
  } else if (language.name === "typescript") {
    updatedSourceCode = cleanupTypescriptInvalidImports(
      parser,
      filePath,
      sourceCode,
      exportIdentifiersMap,
    );
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  return updatedSourceCode;
}

export function cleanupUnusedImports(filePath: string, sourceCode: string) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  let updatedSourceCode: string;
  if (language.name === "javascript") {
    updatedSourceCode = cleanupUnusedJavascriptImports(parser, sourceCode);
  } else if (language.name === "typescript") {
    updatedSourceCode = cleanupUnusedTypescriptImports(parser, sourceCode);
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  return updatedSourceCode;
}

export function cleanupUnusedFiles(
  entrypointPath: string,
  files: { path: string; sourceCode: string }[],
) {
  let fileRemoved = true;
  while (fileRemoved) {
    fileRemoved = false;

    // We always want to keep the entrypoint file.
    // It will never be imported anywhere, so we add it now.
    const filesToKeep = new Set<string>();
    filesToKeep.add(entrypointPath);

    files.forEach((file) => {
      const language = getParserLanguageFromFile(file.path);
      const parser = new Parser();
      parser.setLanguage(language);

      const tree = parser.parse(file.sourceCode);

      let dependencies: {
        node: Parser.SyntaxNode;
        source: string;
        importSpecifierIdentifiers: Parser.SyntaxNode[];
        importIdentifier?: Parser.SyntaxNode;
        namespaceImport?: Parser.SyntaxNode;
      }[];
      if (language.name === "javascript") {
        dependencies = getJavascriptImports(parser, tree.rootNode);
        // Only keep files dependencies
        dependencies = dependencies.filter((dep) => dep.source.startsWith("."));
      } else if (language.name === "typescript") {
        dependencies = getTypescriptImports(parser, tree.rootNode);
        // Only keep files dependencies
        dependencies = dependencies.filter((dep) => dep.source.startsWith("."));
      } else {
        throw new Error(`Unsupported language: ${language.language}`);
      }

      dependencies.forEach((dep) => {
        const resolvedPath = resolveFilePath(dep.source, file.path);
        if (resolvedPath) {
          filesToKeep.add(resolvedPath);
        }
      });
    });

    const previousFilesLength = files.length;

    files = files.filter((file) => {
      return filesToKeep.has(file.path);
    });

    if (files.length !== previousFilesLength) {
      fileRemoved = true;
    }
  }

  return files;
}

export function cleanupUnusedExports(
  files: { path: string; sourceCode: string }[],
  exportIdentifiersMap: Map<
    string,
    {
      namedExports: {
        exportNode: Parser.SyntaxNode;
        identifierNode: Parser.SyntaxNode;
      }[];
      defaultExport?: Parser.SyntaxNode;
    }
  >,
) {
  // TODO need to be implemented

  // Step 1, create variable to track which export is user
  // Step 2, iterate over all file imports. If the import is used, mark the export as used
  // Step 3, iterate over each file, and remove the unused exports

  // Repeat above step until no more unused exports are found
  assert(exportIdentifiersMap);

  return files;
}

export function cleanupErrors(filePath: string, sourceCode: string) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const query = new Parser.Query(parser.getLanguage(), "(ERROR) @error");
  const errorCaptures = query.captures(tree.rootNode);
  errorCaptures.forEach((capture) => {
    indexesToRemove.push({
      startIndex: capture.node.startIndex,
      endIndex: capture.node.endIndex,
    });
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return updatedSourceCode;
}

export function removeIndexesFromSourceCode(
  sourceCode: string,
  indexesToRemove: { startIndex: number; endIndex: number }[],
) {
  let newSourceCode = sourceCode;

  // sort to start removing from the of the file end
  indexesToRemove.sort((a, b) => b.startIndex - a.startIndex);

  indexesToRemove.forEach(({ startIndex, endIndex }) => {
    newSourceCode =
      newSourceCode.slice(0, startIndex) + newSourceCode.slice(endIndex);
  });

  return newSourceCode;
}

export function replaceIndexesFromSourceCode(
  sourceCode: string,
  indexesToReplace: { startIndex: number; endIndex: number; text: string }[],
) {
  // sort to start removing from the end of the file
  indexesToReplace.sort((a, b) => b.startIndex - a.startIndex);

  indexesToReplace.forEach(({ startIndex, endIndex, text }) => {
    sourceCode =
      sourceCode.slice(0, startIndex) + text + sourceCode.slice(endIndex);
  });

  return sourceCode;
}
