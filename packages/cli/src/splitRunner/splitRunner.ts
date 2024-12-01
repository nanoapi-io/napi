import { Group } from "../dependencyManager/types";
import { removeIndexesFromSourceCode } from "../helper/file";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { File } from "./types";
import Parser from "tree-sitter";
import assert from "assert";
import { getLanguagePlugin } from "../languagesPlugins";
import { DepExport } from "../languagesPlugins/types";

class SplitRunner {
  private dependencyTreeManager: DependencyTreeManager;
  private entrypointPath: string;
  private group: Group;
  private files: File[];

  constructor(dependencyTreeManager: DependencyTreeManager, group: Group) {
    this.dependencyTreeManager = dependencyTreeManager;
    this.entrypointPath = dependencyTreeManager.dependencyTree.path;
    this.group = group;
    this.files = dependencyTreeManager.getFiles();
  }

  #removeAnnotationFromOtherGroups() {
    this.files = this.files.map((file) => {
      const languagePlugin = getLanguagePlugin(this.entrypointPath, file.path);

      const updatedSourceCode = languagePlugin.removeAnnotationFromOtherGroups(
        file.sourceCode,
        this.group,
      );
      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #getExportMap() {
    const exportMap = new Map<string, DepExport[]>();

    this.files.forEach((file) => {
      const languagePlugin = getLanguagePlugin(this.entrypointPath, file.path);

      const tree = languagePlugin.parser.parse(file.sourceCode);

      const exports = languagePlugin.getExports(tree.rootNode);

      exportMap.set(file.path, exports);
    });

    return exportMap;
  }

  #removeInvalidImportsAndUsages(exportMap: Map<string, DepExport[]>) {
    this.files = this.files.map((file) => {
      const languagePlugin = getLanguagePlugin(this.entrypointPath, file.path);

      const updatedSourceCode = languagePlugin.cleanupInvalidImports(
        file.path,
        file.sourceCode,
        exportMap,
      );

      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #removeUnusedImports() {
    this.files = this.files.map((file) => {
      const languagePlugin = getLanguagePlugin(this.entrypointPath, file.path);

      const updatedSourceCode = languagePlugin.cleanupUnusedImports(
        file.path,
        file.sourceCode,
      );

      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #removeUnusedFiles() {
    let fileRemoved = true;
    while (fileRemoved) {
      fileRemoved = false;

      // We always want to keep the entrypoint file.
      // It will never be imported anywhere, so we add it now.
      const filesToKeep = new Set<string>();
      filesToKeep.add(this.dependencyTreeManager.dependencyTree.path);

      this.files.forEach((file) => {
        const languagePlugin = getLanguagePlugin(
          this.entrypointPath,
          file.path,
        );

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

      const previousFilesLength = this.files.length;

      this.files = this.files.filter((file) => {
        return filesToKeep.has(file.path);
      });

      if (this.files.length !== previousFilesLength) {
        fileRemoved = true;
      }
    }
  }

  #removeUnusedExports(exportMap: Map<string, DepExport[]>) {
    let exportDeleted = true;
    while (exportDeleted) {
      exportDeleted = false;

      // const usedExportMap = new Map<string, Export>();

      this.files = this.files.map((file) => {
        const languagePlugin = getLanguagePlugin(
          this.entrypointPath,
          file.path,
        );

        const tree = languagePlugin.parser.parse(file.sourceCode);

        const imports = languagePlugin.getImports(file.path, tree.rootNode);

        imports.forEach((depImport) => {
          if (depImport.isExternal || !depImport.source) {
            // Ignore external dependencies
            return;
          }

          // for each import, reconstruct the export map
          const depExport = exportMap.get(depImport.source);
          if (!depExport) {
            throw new Error("Export not found");
          }

          // check named imports
        });

        return file;
      });
    }
    // TODO
    // Step 1, create variable to track which export is used
    // Step 2, iterate over all file imports. If the import is used, mark the export as used
    // Step 3, iterate over each file, and remove the unused exports

    // Repeat above step until no more unused exports are found
    assert(exportMap);
  }

  #removeErrors() {
    this.files = this.files.map((file) => {
      const languagePlugin = getLanguagePlugin(this.entrypointPath, file.path);

      const tree = languagePlugin.parser.parse(file.sourceCode);

      const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

      const query = new Parser.Query(
        languagePlugin.parser.getLanguage(),
        "(ERROR) @error",
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
        indexesToRemove,
      );

      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  run() {
    console.info("\n");
    console.time("Splitting");

    console.time("remove annotation from other groups");
    this.#removeAnnotationFromOtherGroups();
    console.timeEnd("remove annotation from other groups");

    console.time("Get export map");
    const exportMap = this.#getExportMap();
    console.timeEnd("Get export map");

    console.time("Remove invalid imports and usages");
    this.#removeInvalidImportsAndUsages(exportMap);
    console.timeEnd("Remove invalid imports and usages");

    console.time("Remove unused imports");
    this.#removeUnusedImports();
    console.timeEnd("Remove unused imports");

    console.time("Remove unused files");
    this.#removeUnusedFiles();
    console.timeEnd("Remove unused files");

    console.time("Remove unused exports");
    this.#removeUnusedExports(exportMap);
    console.timeEnd("Remove unused exports");

    console.time("Remove errors");
    this.#removeErrors();
    console.timeEnd("Remove errors");

    console.timeEnd("Splitting");

    return this.files;
  }
}

export default SplitRunner;
