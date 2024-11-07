import fs from "fs";
import path from "path";
import {
  getDependencyTree,
  getEndpontsFromTree,
  getGroupsFromEndpoints,
} from "../helper/dependencyTree";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import { createSplit } from "../helper/split";
import { splitSchema } from "./helpers/validation";
import { z } from "zod";
import { GroupMap } from "../helper/types";

export function split(payload: z.infer<typeof splitSchema>) {
  console.time("split command");
  const groupMap: GroupMap = {};

  // Get the dependency tree
  const tree = getDependencyTree(payload.entrypointPath);

  const outputDir = payload.outputDir || path.dirname(payload.entrypointPath);

  // Clean up and prepare the output directory
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
    createSplit(treeClone, group, outputDir, payload.entrypointPath, index);
  });

  // Store the processed annotations in the output directory
  groups.forEach((group, index) => {
    groupMap[index] = group;
  });
  const annotationFilePath = path.join(outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));

  console.timeEnd("split command");
  return { groups, success: true };
}
