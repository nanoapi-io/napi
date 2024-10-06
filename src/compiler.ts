import path from "path";
import fs from "fs";
import { Dependencies, NanoAPIAnnotation } from "./helper/types";
import {
  getAnnotationsFromFile,
  cleanupOutputDir,
  createOutputDir,
} from "./helper/file";
import {
  getDependencyTree,
  removeInvalidImportsAndUsages,
} from "./helper/dependencies";

export class Compiler {
  entrypoint: string;
  targetDir: string;
  outputDir: string;
  splitDirName: string;
  annotationIndex: number;
  annotationsMap: Record<number, { method: string; path: string }>;

  constructor(
    entrypoint: string, // Path to the entrypoint file
    targetDir: string, // Path to the target directory
    outputDir: string, // Path to the output directory
  ) {
    this.entrypoint = entrypoint;
    this.targetDir = targetDir || path.dirname(entrypoint);
    this.outputDir = outputDir;
    this.splitDirName = "nanoapi-split";
    this.annotationIndex = 0;
    this.annotationsMap = {};
  }

  async run() {
    console.log("Running compiler...");
    const tree = getDependencyTree(this.entrypoint);
    cleanupOutputDir(this.outputDir);
    createOutputDir(this.outputDir);
    await this.iterateOverTree(tree);
    this.createAnnotationFile();
    console.log("Compilation complete");
  }

  async iterateOverTree(tree: Dependencies, parentFiles: string[] = []) {
    for (const [filePath, value] of Object.entries(tree)) {
      const annotations = await getAnnotationsFromFile(
        parentFiles,
        filePath,
        tree,
        "@nanoapi",
      );
      for (const annotation of annotations) {
        this.splitPath(annotation);
      }

      if (typeof value !== "string") {
        const updatedParentFiles = [...parentFiles, filePath];
        await this.iterateOverTree(value, updatedParentFiles);
      }
    }
  }

  splitPath(annotation: NanoAPIAnnotation) {
    const splitDirectory = path.join(this.outputDir, this.splitDirName);
    const annotationDirectory = path.join(
      splitDirectory,
      this.annotationIndex.toString(),
    );
    this.annotationsMap[this.annotationIndex] = {
      method: annotation.method,
      path: annotation.path,
    };
    this.annotationIndex++;

    fs.mkdirSync(annotationDirectory, { recursive: true });
    const entrypointPath = path.join(
      annotationDirectory,
      path.basename(this.entrypoint),
    );
    fs.copyFileSync(this.entrypoint, entrypointPath);
    for (const filePath of annotation.filePaths) {
      const relativeFileNamePath = path.relative(this.targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(filePath, destinationPath);
    }

    removeInvalidImportsAndUsages(entrypointPath);
    for (const filePath of annotation.filePaths) {
      const relativeFileNamePath = path.relative(this.targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );
      removeInvalidImportsAndUsages(destinationPath);
    }
  }

  createAnnotationFile() {
    const annotationFilePath = path.join(
      this.outputDir,
      this.splitDirName,
      "annotations.json",
    );
    fs.writeFileSync(annotationFilePath, JSON.stringify(this.annotationsMap));
  }
}
