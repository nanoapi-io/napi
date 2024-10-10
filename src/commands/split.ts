import path from "path";
import fs from "fs";
import { getDependencyTree, cleanupFile } from "../helper/dependencies";
import {
  cleanupOutputDir,
  createOutputDir,
  getAnnotationsFromFile,
} from "../helper/file";
import { Dependencies, NanoAPIAnnotation } from "../helper/types";

export default function splitCommandHandler(
  entrypoint: string, // Path to the entrypoint file
  targetDir: string, // Path to the target directory
  outputDir: string, // Path to the output directory
) {
  const splitDirName = "nanoapi-split";
  let annotationIndex = 0;
  const annotationsMap: Record<number, { method: string; path: string }> = {};

  const tree = getDependencyTree(entrypoint);
  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);
  iterateOverTree(tree);
  const annotationFilePath = path.join(
    outputDir,
    splitDirName,
    "annotations.json",
  );
  fs.writeFileSync(annotationFilePath, JSON.stringify(annotationsMap));

  function iterateOverTree(tree: Dependencies, parentFiles: string[] = []) {
    for (const [filePath, value] of Object.entries(tree)) {
      const annotations = getAnnotationsFromFile(parentFiles, filePath, tree);
      for (const annotation of annotations) {
        splitPath(annotation);
      }

      if (typeof value !== "string") {
        const updatedParentFiles = [...parentFiles, filePath];
        iterateOverTree(value, updatedParentFiles);
      }
    }
  }

  function splitPath(annotation: NanoAPIAnnotation) {
    const splitDirectory = path.join(outputDir, splitDirName);
    const annotationDirectory = path.join(
      splitDirectory,
      annotationIndex.toString(),
    );
    annotationsMap[annotationIndex] = {
      method: annotation.method,
      path: annotation.path,
    };
    annotationIndex++;

    fs.mkdirSync(annotationDirectory, { recursive: true });
    const entrypointPath = path.join(
      annotationDirectory,
      path.basename(entrypoint),
    );
    fs.copyFileSync(entrypoint, entrypointPath);
    for (const filePath of annotation.filePaths) {
      const relativeFileNamePath = path.relative(targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(filePath, destinationPath);
    }

    cleanupFile(entrypointPath, annotation);
    for (const filePath of annotation.filePaths) {
      const relativeFileNamePath = path.relative(targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );
      cleanupFile(destinationPath, annotation);
    }
  }
}
