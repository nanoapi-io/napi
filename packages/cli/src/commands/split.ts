import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { cleanupOutputDir, createOutputDir } from "../helper/file";
import { runWithWorker, writeSplitsToDisk } from "../splitRunner/splitRunner";

export default async function splitCommandHandler(
  entrypointPath: string, // Path to the entrypoint file
  outputDir: string, // Path to the output directory
) {
  console.time("split command");
  const dependencyTreeManager = new DependencyTreeManager(entrypointPath);

  cleanupOutputDir(outputDir);
  createOutputDir(outputDir);

  // Get groups from the dependency tree
  const groups = dependencyTreeManager.getGroups();

  // Process each group for splitting
  const splits = groups.map((group, index) =>
    runWithWorker(
      index,
      group,
      dependencyTreeManager.entryPointPath,
      dependencyTreeManager.getFiles(),
    ),
  );

  // Wait for all splits to be processed
  const processedSplits = await Promise.all(splits.map(async (split) => split));

  writeSplitsToDisk(outputDir, entrypointPath, processedSplits);

  console.timeEnd("split command");
}
