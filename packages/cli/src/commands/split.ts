import path from "path";
import fs from "fs";
import {
  getDependencyTree,
  getEndpontsFromTree,
  getGroupsFromEndpoints,
} from "../helper/dependencyTree";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import { createSplit } from "../helper/split";
import { GroupMap } from "../helper/types";

export default function splitCommandHandler(
  entrypointPath: string, // Path to the entrypoint file
  outputDir: string, // Path to the output directory
) {
  let groupIndex = 0;
  const groupMap: GroupMap = {};

  const tree = getDependencyTree(entrypointPath);

  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Iterate over the tree and get endpoints
  const endpoints = getEndpontsFromTree(tree);

  // Get groups from the endpoints
  const groups = getGroupsFromEndpoints(endpoints);

  // Process each endpoint for splitting
  for (const group of groups) {
    createSplit(group, outputDir, entrypointPath, groupMap, groupIndex);
    groupIndex++;
  }

  // Store the processed annotations in the output directory
  const annotationFilePath = path.join(outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));
}
