import path from "path";
import { Worker } from "worker_threads";
import { Group } from "../dependencyManager/types";
import { File } from "./types";
import { getLanguagePlugin } from "../languagesPlugins";
import { DepExport } from "../languagesPlugins/types";
import { removeIndexesFromSourceCode } from "../helpers/file";
import assert from "assert";
import Parser from "tree-sitter";
import fs from "fs";

export class SplitRunner {
  private index: number;
  private group: Group;
  private entrypointPath: string;
  private files: File[];

  constructor(
    index: number,
    group: Group,
    entrypointPath: string,
    files: File[],
  ) {
    this.index = index;
    this.entrypointPath = entrypointPath;
    this.group = group;
    this.files = files;
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
      filesToKeep.add(this.entrypointPath);

      this.files.forEach((file) => {
        const languagePlugin = getLanguagePlugin(
          this.entrypointPath,
          file.path,
        );

        const tree = languagePlugin.parser.parse(file.sourceCode);

        const imports = languagePlugin.getImports(file.path, tree.rootNode);

        imports.forEach((depImport) => {
          if (depImport.isExternal) {
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
          if (depImport.isExternal) {
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
    console.time(`Splitting-${this.index}`);

    console.time(`remove annotation from other groups-${this.index}`);
    this.#removeAnnotationFromOtherGroups();
    console.timeEnd(`remove annotation from other groups-${this.index}`);

    console.time(`Get export map-${this.index}`);
    const exportMap = this.#getExportMap();
    console.timeEnd(`Get export map-${this.index}`);

    console.time(`Remove invalid imports and usages-${this.index}`);
    this.#removeInvalidImportsAndUsages(exportMap);
    console.timeEnd(`Remove invalid imports and usages-${this.index}`);

    console.time(`Remove unused imports-${this.index}`);
    this.#removeUnusedImports();
    console.timeEnd(`Remove unused imports-${this.index}`);

    console.time(`Remove unused files-${this.index}`);
    this.#removeUnusedFiles();
    console.timeEnd(`Remove unused files-${this.index}`);

    console.time(`Remove unused exports-${this.index}`);
    this.#removeUnusedExports(exportMap);
    console.timeEnd(`Remove unused exports-${this.index}`);

    console.time(`Remove errors-${this.index}`);
    this.#removeErrors();
    console.timeEnd(`Remove errors-${this.index}`);

    console.timeEnd(`Splitting-${this.index}`);

    return { index: this.index, group: this.group, files: this.files };
  }
}

export function runWithWorker(
  index: number,
  group: Group,
  entryPointPath: string,
  files: File[],
) {
  const worker = new Worker(path.resolve(__dirname, "worker"), {
    workerData: {
      index,
      group,
      entryPointPath,
      files,
    },
  });

  return new Promise<{ index: number; group: Group; files: File[] }>(
    (resolve, reject) => {
      worker.on(
        "message",
        (split: { index: number; group: Group; files: File[] }) => {
          resolve(split);
        },
      );

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    },
  );
}

export function writeSplitsToDisk(
  outputDir: string,
  entrypointPath: string,
  splits: { index: number; group: Group; files: File[] }[],
) {
  const targetDir = path.dirname(entrypointPath);
  const groupMap: Record<number, Group> = {};

  splits.forEach((split) => {
    const annotationDirectory = path.join(outputDir, split.index.toString());

    split.files.forEach((file) => {
      const relativeFileNamePath = path.relative(targetDir, file.path);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, file.sourceCode, "utf8");
    });

    groupMap[split.index] = split.group;
  });

  const annotationFilePath = path.join(outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));
}
