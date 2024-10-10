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
import { Dependencies, NanoAPIAnnotation } from "./types";

// extract the dependencies from the AST
export function getDependencyTree(
  filePath: string,
  visited = new Set<string>(),
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  const tree = parser.parse(sourceCode);

  let imports: string[] = [];
  if (["javascript", "typescript"].includes(language.name)) {
    imports = extractJavascriptFileImports(tree.rootNode);
  } else {
    throw new Error(`Unsupported language: ${language.language}`);
  }

  const dependencies: Dependencies = {};
  imports.forEach((importPath) => {
    const resolvedPath = resolveFilePath(importPath, filePath);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      dependencies[resolvedPath] = getDependencyTree(resolvedPath, visited);
    }
  });

  return dependencies;
}

export function cleanupFile(filePath: string, annotation: NanoAPIAnnotation) {
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
      annotation,
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
