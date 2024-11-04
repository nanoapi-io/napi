import fs from "fs";
import Parser from "tree-sitter";
import { cleanupJavascriptFile } from "./languages/javascript/cleanup";
import { extractJavascriptFileImports } from "./languages/javascript/imports";

import { resolveFilePath } from "./file";
import { Group } from "./types";
import { getParserLanguageFromFile } from "./treeSitter";

export function cleanupFile(filePath: string, group: Group) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");

  let dependencies: string[] = [];
  if (["javascript", "typescript"].includes(language.name)) {
    dependencies = extractJavascriptFileImports(parser, sourceCode);
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  // Check if we can resolve the path for each dependency. If we cannot, we need to remove it
  const invalidDependencies = dependencies.filter(
    (dep) => !resolveFilePath(dep, filePath),
  );

  let updatedSourceCode: string;

  if (["javascript", "typescript"].includes(language.name)) {
    updatedSourceCode = cleanupJavascriptFile(
      parser,
      sourceCode,
      group,
      invalidDependencies,
    );
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  fs.writeFileSync(filePath, updatedSourceCode, "utf8");
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
