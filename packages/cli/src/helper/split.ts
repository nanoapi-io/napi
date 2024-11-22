import { Group } from "./types";
import {
  cleanupAnnotations,
  getExportMap,
  cleanupInvalidImports,
  cleanupUnusedImports,
  cleanupUnusedFiles,
  cleanupErrors,
  cleanupUnusedExports,
} from "./cleanup";
import DependencyTreeManager from "./dependencyTree";
import Parser from "tree-sitter";

class SplitRunner {
  private dependencyTreeManager: DependencyTreeManager;
  private group: Group;
  private files: { path: string; sourceCode: string }[];

  constructor(dependencyTreeManager: DependencyTreeManager, group: Group) {
    this.dependencyTreeManager = dependencyTreeManager;
    this.group = group;
    this.files = dependencyTreeManager.getFiles();
  }

  #getExportMap() {
    return getExportMap(this.files);
  }

  #removeAnnotationFromOtherGroups() {
    this.files = this.files.map((file) => {
      const updatedSourceCode = cleanupAnnotations(
        file.path,
        file.sourceCode,
        this.group,
      );
      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #removeInvalidImportsAndUsages(
    exportMap: Map<
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
    this.files = this.files.map((file) => {
      const updatedSourceCode = cleanupInvalidImports(
        file.path,
        file.sourceCode,
        exportMap,
      );
      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #removeUnusedImports() {
    this.files = this.files.map((file) => {
      const updatedSourceCode = cleanupUnusedImports(
        file.path,
        file.sourceCode,
      );
      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  #removeUnusedFiles() {
    this.files = cleanupUnusedFiles(
      this.dependencyTreeManager.dependencyTree.path,
      this.files,
    );
  }

  #removeUnusedExports(
    exportMap: Map<
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
    this.files = cleanupUnusedExports(this.files, exportMap);
  }

  #removeErrors() {
    this.files = this.files.map((file) => {
      const updatedSourceCode = cleanupErrors(file.path, file.sourceCode);
      return { ...file, sourceCode: updatedSourceCode };
    });
  }

  run() {
    console.log("\n");
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
