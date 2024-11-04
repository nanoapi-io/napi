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
  let groupIndex = 0;
  const groupMap: GroupMap = {};

  // Get the dependency tree
  const tree = getDependencyTree(payload.entrypointPath);

  payload.outputDir = payload.outputDir || path.dirname(payload.entrypointPath);

  // Clean up and prepare the output directory
  cleanupOutputDir(payload.outputDir);
  createOutputDir(payload.outputDir);

  // Iterate over the tree and get endpoints
  const endpoints = getEndpontsFromTree(tree);

  // Get groups from the endpoints
  const groups = getGroupsFromEndpoints(endpoints);

  // Process each endpoint for splitting
  for (const group of groups) {
    createSplit(
      group,
      payload.outputDir,
      payload.entrypointPath,
      groupMap,
      groupIndex,
    );
    groupIndex++;
  }

  // Store the processed annotations in the output directory
  const annotationFilePath = path.join(payload.outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));

  return { groups, success: true };
}
