import path from "path";
import fs from "fs";
import { getDependencyTree, cleanupFile } from "../helper/dependencies";
import {
  cleanupOutputDir,
  createOutputDir,
  getEndpointsFromFile,
} from "../helper/file";
import { Dependencies, Endpoint } from "../helper/types";

export default function splitCommandHandler(
  entrypoint: string, // Path to the entrypoint file
  targetDir: string, // Path to the target directory
  outputDir: string // Path to the output directory
) {
  const splitDirName = "nanoapi-split";
  let endpointIndex = 0;
  const endpointMap: Record<number, { method?: string; path: string }> = {};

  const tree = getDependencyTree(entrypoint);
  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);
  iterateOverTree(tree);
  const annotationFilePath = path.join(
    outputDir,
    splitDirName,
    "annotations.json"
  );
  fs.writeFileSync(annotationFilePath, JSON.stringify(endpointMap));

  function iterateOverTree(tree: Dependencies, parentFiles: string[] = []) {
    for (const [filePath, value] of Object.entries(tree)) {
      const endpoints = getEndpointsFromFile(parentFiles, filePath, tree);
      for (const endpoint of endpoints) {
        splitPath(endpoint);
      }

      if (typeof value !== "string") {
        const updatedParentFiles = [...parentFiles, filePath];
        iterateOverTree(value, updatedParentFiles);
      }
    }
  }

  function splitPath(endpoint: Endpoint) {
    const splitDirectory = path.join(outputDir, splitDirName);
    const annotationDirectory = path.join(
      splitDirectory,
      endpointIndex.toString()
    );
    endpointMap[endpointIndex] = {
      method: endpoint.method,
      path: endpoint.path,
    };
    endpointIndex++;

    fs.mkdirSync(annotationDirectory, { recursive: true });
    const entrypointPath = path.join(
      annotationDirectory,
      path.basename(entrypoint)
    );
    fs.copyFileSync(entrypoint, entrypointPath);

    for (const filePath of [
      endpoint.filePath,
      ...endpoint.parentFilePaths,
      ...endpoint.childrenFilePaths,
    ]) {
      const relativeFileNamePath = path.relative(targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath
      );

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(filePath, destinationPath);
    }

    cleanupFile(entrypointPath, endpoint);
    for (const filePath of [
      endpoint.filePath,
      ...endpoint.parentFilePaths,
      ...endpoint.childrenFilePaths,
    ]) {
      const relativeFileNamePath = path.relative(targetDir, filePath);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath
      );
      cleanupFile(destinationPath, endpoint);
    }
  }
}
