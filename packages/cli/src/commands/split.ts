import path from "path";
import fs from "fs";
import DependencyTreeManager from "../helper/dependencyTree";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import SplitRunner from "../helper/split";
import { GroupMap } from "../helper/types";

export default function splitCommandHandler(
  entrypointPath: string, // Path to the entrypoint file
  outputDir: string, // Path to the output directory
) {
  const groupMap: GroupMap = {};

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
}
