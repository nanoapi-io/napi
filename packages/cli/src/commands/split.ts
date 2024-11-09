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
  const groupMap: GroupMap = {};

  const tree = getDependencyTree(entrypointPath);

  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Iterate over the tree and get endpoints
  const endpoints = getEndpontsFromTree(tree);

  // Get groups from the endpoints
  const groups = getGroupsFromEndpoints(endpoints);

  // Process each group for splitting
  groups.forEach((group, index) => {
    // Clone the tree to avoid mutation of the original tree
    const treeClone = structuredClone(tree);
    createSplit(treeClone, group, outputDir, entrypointPath, index);
  });

  // Store the processed annotations in the output directory
  groups.forEach((group, index) => {
    groupMap[index] = group;
  });
  const annotationFilePath = path.join(outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));
}
