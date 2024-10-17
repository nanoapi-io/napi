import fs from "fs";
import path from "path";
import { getDependencyTree } from "../helper/dependencies";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import {
  SplitCodebaseRequestPayload,
  SplitCodebaseResponsePayload,
} from "../helper/payloads";
import { iterateOverTree, splitPath } from "../helper/tree";

export function split(
  splitRequestPayload: SplitCodebaseRequestPayload
): SplitCodebaseResponsePayload {
  const { entrypointPath, targetDir, outputDir } = splitRequestPayload;
  const splitDirName = "nanoapi-split";
  let endpointIndex = 0;
  const endpointMap: Record<number, { method?: string; path: string }> = {};

  // Get the dependency tree
  const tree = getDependencyTree(entrypointPath);

  // Clean up and prepare the output directory
  const outputDirectory = outputDir || path.dirname(entrypointPath);
  cleanupOutputDir(outputDirectory);
  createOutputDir(outputDirectory);

  // Iterate over the tree and process endpoints
  const endpoints = iterateOverTree(tree);

  // Process each endpoint for splitting
  for (const endpoint of endpoints) {
    splitPath(
      endpoint,
      outputDirectory,
      entrypointPath,
      targetDir!,
      endpointMap,
      endpointIndex
    );
    endpointIndex++;
  }

  // Store the processed annotations in the output directory
  const annotationFilePath = path.join(
    outputDirectory,
    splitDirName,
    "annotations.json"
  );
  fs.writeFileSync(annotationFilePath, JSON.stringify(endpointMap));

  return { endpoints, success: true };
}
