import fs from "fs";
import Parser from "tree-sitter";
import {
  extractJavascriptFileImports,
  removeInvalidJavascriptFileImports,
  removeJavascriptAnnotations,
  removeJavascriptDeletedImportUsage,
  removeUnusedJavascriptImports,
} from "./languages/javascript";
import { getParserLanguageFromFile, resolveFilePath } from "./file";
import { Dependencies, Endpoint } from "./types";

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
    const tree = parser.parse(sourceCode);

    let imports: string[] = [];
    if (["javascript", "typescript"].includes(language.name)) {
      imports = extractJavascriptFileImports(tree.rootNode);
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

export function cleanupFile(filePath: string, endpoint: Endpoint) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  let tree = parser.parse(sourceCode);

  let dependencies: string[] = [];
  if (["javascript", "typescript"].includes(language.name)) {
    dependencies = extractJavascriptFileImports(tree.rootNode);
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  // Check if we can resolve the path for each dependency
  // If we cannot, we need to remove it
  const invalidDependencies = dependencies.filter(
    (dep) => !resolveFilePath(dep, filePath),
  );

  if (["javascript", "typescript"].includes(language.name)) {
    const newSourceCode = removeJavascriptAnnotations(
      tree.rootNode,
      sourceCode,
      endpoint,
    );
    tree = parser.parse(newSourceCode);

    const { updatedSourceCode, removedImportsNames } =
      removeInvalidJavascriptFileImports(
        tree.rootNode,
        newSourceCode,
        invalidDependencies,
      );
    tree = parser.parse(updatedSourceCode);

    let finalUpdatedSourceCode = removeJavascriptDeletedImportUsage(
      tree.rootNode,
      updatedSourceCode,
      removedImportsNames,
    );
    tree = parser.parse(finalUpdatedSourceCode);

    finalUpdatedSourceCode = removeUnusedJavascriptImports(
      tree.rootNode,
      finalUpdatedSourceCode,
    );

    fs.writeFileSync(filePath, finalUpdatedSourceCode, "utf8");
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }
}
