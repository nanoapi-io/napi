import path from "path";
import fs from "fs";
import { getDependencyTree } from "../helper/dependencies";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import { iterateOverTree, splitPath } from "../helper/tree";

export default function splitCommandHandler(
  entrypointPath: string, // Path to the entrypoint file
  outputDir: string, // Path to the output directory
) {
  const splitDirName = "nanoapi-split";
  let endpointIndex = 0;
  const endpointMap: Record<number, { method?: string; path: string }> = {};

  const tree = getDependencyTree(entrypointPath);

  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Iterate over the tree and process endpoints
  const endpoints = iterateOverTree(tree);

  // Process each endpoint for splitting
  for (const endpoint of endpoints) {
    splitPath(endpoint, outputDir, entrypointPath, endpointMap, endpointIndex);
    endpointIndex++;
  }

  // Store the processed annotations in the output directory
  const annotationFilePath = path.join(
    outputDir,
    splitDirName,
    "annotations.json",
  );
  fs.writeFileSync(annotationFilePath, JSON.stringify(endpointMap));
}
