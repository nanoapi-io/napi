import assert from "assert";
import Parser from "tree-sitter";
import { parentPort, workerData } from "worker_threads";
import { Group } from "../dependencyManager/types";
import { removeIndexesFromSourceCode } from "../helper/file";
import { getLanguagePlugin } from "../languagesPlugins";
import { DepExport } from "../languagesPlugins/types";
import { File } from "./types";

const {
  entrypointPath,
  group,
  files,
}: {
  entrypointPath: string;
  group: Group;
  files: File[];
} = workerData;

let currentFiles = files;

function removeAnnotationFromOtherGroups() {
  currentFiles = currentFiles.map((file) => {
    const languagePlugin = getLanguagePlugin(entrypointPath, file.path);

    const updatedSourceCode = languagePlugin.removeAnnotationFromOtherGroups(
      file.sourceCode,
      group
    );
    return { ...file, sourceCode: updatedSourceCode };
  });
}

function getExportMap() {
  const exportMap = new Map<string, DepExport[]>();

  currentFiles.forEach((file) => {
    const languagePlugin = getLanguagePlugin(entrypointPath, file.path);
    const tree = languagePlugin.parser.parse(file.sourceCode);
    const exports = languagePlugin.getExports(tree.rootNode);
    exportMap.set(file.path, exports);
  });

  return exportMap;
}

function removeInvalidImportsAndUsages(exportMap: Map<string, DepExport[]>) {
  currentFiles = currentFiles.map((file) => {
    const languagePlugin = getLanguagePlugin(entrypointPath, file.path);

    const updatedSourceCode = languagePlugin.cleanupInvalidImports(
      file.path,
      file.sourceCode,
      exportMap
    );

    return { ...file, sourceCode: updatedSourceCode };
  });
}

function removeUnusedImports() {
  currentFiles = currentFiles.map((file) => {
    const languagePlugin = getLanguagePlugin(entrypointPath, file.path);

    const updatedSourceCode = languagePlugin.cleanupUnusedImports(
      file.path,
      file.sourceCode
    );

    return { ...file, sourceCode: updatedSourceCode };
  });
}

function removeUnusedFiles() {
  let fileRemoved = true;
  while (fileRemoved) {
    fileRemoved = false;

    // We always want to keep the entrypoint file.
    // It will never be imported anywhere, so we add it now.
    const filesToKeep = new Set<string>();
    filesToKeep.add(entrypointPath);

    currentFiles.forEach((file) => {
      const languagePlugin = getLanguagePlugin(entrypointPath, file.path);

      const tree = languagePlugin.parser.parse(file.sourceCode);

      const imports = languagePlugin.getImports(file.path, tree.rootNode);

      imports.forEach((depImport) => {
        if (depImport.isExternal || !depImport.source) {
          // Ignore external dependencies
          return;
        }

        filesToKeep.add(depImport.source);
      });
    });

    const previousFilesLength = currentFiles.length;

    currentFiles = currentFiles.filter((file) => {
      return filesToKeep.has(file.path);
    });

    if (currentFiles.length !== previousFilesLength) {
      fileRemoved = true;
    }
  }
}

function removeUnusedExports(exportMap: Map<string, DepExport[]>) {
  let exportDeleted = true;
  while (exportDeleted) {
    exportDeleted = false;

    // TODO: Implement logic if needed. For now, we just assert exportMap.
    assert(exportMap);
  }
  // TODO steps (left as comments):
  // Step 1, create variable to track which export is used
  // Step 2, iterate over all file imports. If the import is used, mark the export as used
  // Step 3, iterate over each file, and remove the unused exports
  // Repeat above step until no more unused exports are found
}

function removeErrors() {
  currentFiles = currentFiles.map((file) => {
    const languagePlugin = getLanguagePlugin(entrypointPath, file.path);

    const tree = languagePlugin.parser.parse(file.sourceCode);

    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const query = new Parser.Query(
      languagePlugin.parser.getLanguage(),
      "(ERROR) @error"
    );
    const errorCaptures = query.captures(tree.rootNode);
    errorCaptures.forEach((capture) => {
      indexesToRemove.push({
        startIndex: capture.node.startIndex,
        endIndex: capture.node.endIndex,
      });
    });

    const updatedSourceCode = removeIndexesFromSourceCode(
      file.sourceCode,
      indexesToRemove
    );

    return { ...file, sourceCode: updatedSourceCode };
  });
}

(async () => {
  console.time("remove annotation from other groups");
  removeAnnotationFromOtherGroups();
  console.timeEnd("remove annotation from other groups");

  console.time("Get export map");
  const exportMap = getExportMap();
  console.timeEnd("Get export map");

  console.time("Remove invalid imports and usages");
  removeInvalidImportsAndUsages(exportMap);
  console.timeEnd("Remove invalid imports and usages");

  console.time("Remove unused imports");
  removeUnusedImports();
  console.timeEnd("Remove unused imports");

  console.time("Remove unused files");
  removeUnusedFiles();
  console.timeEnd("Remove unused files");

  console.time("Remove unused exports");
  removeUnusedExports(exportMap);
  console.timeEnd("Remove unused exports");

  console.time("Remove errors");
  removeErrors();
  console.timeEnd("Remove errors");

  // Send updated files back to the parent
  parentPort?.postMessage(currentFiles);
})();
