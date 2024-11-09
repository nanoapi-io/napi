import fs from "fs";
import path from "path";
import { DependencyTree, Group } from "./types";
import {
  cleanupAnnotations,
  getExportMap,
  cleanupInvalidImports,
  cleanupUnusedImports,
  cleanupUnusedFiles,
  cleanupErrors,
  cleanupUnusedExports,
} from "./cleanup";
import { getFilesFromDependencyTree } from "./dependencyTree";

// Function to handle splitting and storing paths based on the split command logic
export async function createSplit(
  tree: DependencyTree,
  group: Group,
  outputDirectory: string,
  entrypointPath: string,
  groupMapIndex: number,
) {
  console.time(`split ${groupMapIndex}`);
  let files = getFilesFromDependencyTree(tree);

  console.time("remove annotation from other groups");
  // Step 1, remove annotation from other groups
  files = files.map((file) => {
    const updatedSourceCode = cleanupAnnotations(
      file.path,
      file.sourceCode,
      group,
    );
    return { ...file, sourceCode: updatedSourceCode };
  });
  console.timeEnd("remove annotation from other groups");

  console.time("Check for invalid imports and delete their usage");
  // Step 2, Check for invalid imports and delete their usage
  let exportIdentifiersMap = getExportMap(files);
  files = files.map((file) => {
    const updatedSourceCode = cleanupInvalidImports(
      file.path,
      file.sourceCode,
      exportIdentifiersMap,
    );
    return { ...file, sourceCode: updatedSourceCode };
  });
  console.timeEnd("Check for invalid imports and delete their usage");

  console.time("Remove unused import");
  // Step 3, Remove unused import
  files = files.map((file) => {
    const updatedSourceCode = cleanupUnusedImports(file.path, file.sourceCode);
    return { ...file, sourceCode: updatedSourceCode };
  });
  console.timeEnd("Remove unused import");

  console.time("Check for unused files and delete them");
  // Step 4, Check for unused files and delete them
  files = cleanupUnusedFiles(entrypointPath, files);
  console.timeEnd("Check for unused files and delete them");

  console.time("Remove unused export");
  // Step 5, Check for unused export and delete them
  exportIdentifiersMap = getExportMap(files);
  files = cleanupUnusedExports(files, exportIdentifiersMap);
  console.timeEnd("Remove unused export");

  console.time("Remove all tree sitter ERRORS");
  // Step 6, Remove all tree sitter ERRORS
  files = files.map((file) => {
    const updatedSourceCode = cleanupErrors(file.path, file.sourceCode);
    return { ...file, sourceCode: updatedSourceCode };
  });
  console.timeEnd("Remove all tree sitter ERRORS");

  console.time("Write to disk each file");
  // Step 7, Write to disk each file
  const targetDir = path.dirname(entrypointPath);
  const annotationDirectory = path.join(
    outputDirectory,
    groupMapIndex.toString(),
  );
  files.forEach((file) => {
    const relativeFileNamePath = path.relative(targetDir, file.path);
    const destinationPath = path.join(
      annotationDirectory,
      relativeFileNamePath,
    );
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, file.sourceCode, "utf8");
  });
  console.timeEnd("Write to disk each file");

  console.timeEnd(`split ${groupMapIndex}`);
  console.info("\n");
}
