import fs from "fs";
import path from "path";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import SplitRunner from "../splitRunner/splitRunner";
import { splitSchema } from "./helpers/validation";
import { z } from "zod";
import { Group } from "../dependencyManager/types";

export function split(payload: z.infer<typeof splitSchema>) {
  console.time("split command");
  const groupMap: Record<number, Group> = {};

  // Get the dependency tree
  const dependencyTreeManager = new DependencyTreeManager(
    payload.entrypointPath,
  );

  const outputDir = payload.outputDir || path.dirname(payload.entrypointPath);

  // Clean up and prepare the output directory
  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Get groups from the dependency tree
  const groups = dependencyTreeManager.getGroups();

  // Process each group for splitting
  groups.forEach((group, index) => {
    const splitRunner = new SplitRunner(dependencyTreeManager, group);
    const files = splitRunner.run();

    const targetDir = path.dirname(payload.entrypointPath);
    const annotationDirectory = path.join(outputDir, index.toString());

    files.forEach((file) => {
      const relativeFileNamePath = path.relative(targetDir, file.path);
      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath,
      );
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, file.sourceCode, "utf8");
    });
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
