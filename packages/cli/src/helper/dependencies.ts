import fs from "fs";
import Parser from "tree-sitter";
import { cleanupJavascriptFile } from "./languages/javascript/cleanup";
import { extractJavascriptFileImports } from "./languages/javascript/imports";

import { getParserLanguageFromFile, resolveFilePath } from "./file";
import { Dependencies, Group } from "./types";

// extract the dependencies from the AST
export function getDependencyTree(filePath: string): Dependencies {
  const dependencies: Dependencies = {};

  function buildTree(
    currentFilePath: string,
    visited = new Set<string>(),
  ): Dependencies {
    if (visited.has(currentFilePath)) {
      return {};
    }
    visited.add(currentFilePath);

    const language = getParserLanguageFromFile(currentFilePath);
    const parser = new Parser();
    parser.setLanguage(language);

    const sourceCode = fs.readFileSync(currentFilePath, "utf8");

    let imports: string[] = [];
    if (["javascript", "typescript"].includes(language.name)) {
      imports = extractJavascriptFileImports(parser, sourceCode);
    } else {
      throw new Error(`Unsupported language: ${language.name}`);
    }

    const currentDependencies: Dependencies = {};

    imports.forEach((importPath) => {
      const resolvedPath = resolveFilePath(importPath, currentFilePath);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        currentDependencies[resolvedPath] = buildTree(resolvedPath, visited);
      }
    });

    return currentDependencies;
  }

  // Initialize the dependency tree with the top parent file
  dependencies[filePath] = buildTree(filePath);

  return dependencies;
}

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
