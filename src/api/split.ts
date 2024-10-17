import fs from "fs";
import path from "path";
import { getDependencyTree } from "../helper/dependencies";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import { SplitCodebaseResponsePayload } from "../helper/payloads";
import { iterateOverTree, splitPath } from "../helper/tree";
import { splitSchema } from "./helpers/validation";
import { z } from "zod";

export function split(
  payload: z.infer<typeof splitSchema>
): SplitCodebaseResponsePayload {
  const splitDirName = "nanoapi-split";
  let endpointIndex = 0;
  const endpointMap: Record<number, { method?: string; path: string }> = {};

  // Get the dependency tree
  const tree = getDependencyTree(payload.entrypointPath);

  payload.targetDir = payload.targetDir || path.dirname(payload.entrypointPath);
  payload.outputDir = payload.outputDir || path.dirname(payload.entrypointPath);

  // Clean up and prepare the output directory
  cleanupOutputDir(payload.outputDir);
  createOutputDir(payload.outputDir);

  // Iterate over the tree and process endpoints
  const endpoints = iterateOverTree(tree);

  // Process each endpoint for splitting
  for (const endpoint of endpoints) {
    splitPath(
      endpoint,
      payload.outputDir,
      payload.entrypointPath,
      payload.targetDir,
      endpointMap,
      endpointIndex
    );
    endpointIndex++;
  }

  // Store the processed annotations in the output directory
  const annotationFilePath = path.join(
    payload.outputDir,
    splitDirName,
    "annotations.json"
  );
  fs.writeFileSync(annotationFilePath, JSON.stringify(endpointMap));

  return { endpoints, success: true };
}
