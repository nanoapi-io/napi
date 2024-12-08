import fs from "fs";
import path from "path";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { Group } from "../dependencyManager/types";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import SplitRunner from "../splitRunner/splitRunner";

export default function splitCommandHandler(
  entrypointPath: string, // Path to the entrypoint file
  outputDir: string // Path to the output directory
) {
  const groupMap: Record<number, Group> = {};

  const dependencyTreeManager = new DependencyTreeManager(entrypointPath);

  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Get groups from the dependency tree
  const groups = dependencyTreeManager.getGroups();

  // Process each group for splitting
  groups.forEach((group, index) => {
    const splitRunner = new SplitRunner(dependencyTreeManager, group);
    const files = splitRunner.run();

    const targetDir = path.dirname(entrypointPath);
    const annotationDirectory = path.join(outputDir, index.toString());

    files
      .then((files) => {
        files.forEach((file) => {
          const relativeFileNamePath = path.relative(targetDir, file.path);
          const destinationPath = path.join(
            annotationDirectory,
            relativeFileNamePath
          );
          fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
          fs.writeFileSync(destinationPath, file.sourceCode, "utf8");
        });
      })
      .catch((error) => {
        console.error(error);
        throw error;
      });
  });

  // Store the processed annotations in the output directory
  groups.forEach((group, index) => {
    groupMap[index] = group;
  });
  const annotationFilePath = path.join(outputDir, "annotations.json");
  fs.writeFileSync(annotationFilePath, JSON.stringify(groupMap, null, 2));
}
