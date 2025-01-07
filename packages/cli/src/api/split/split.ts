import { z } from "zod";
import DependencyTreeManager from "../../dependencyManager/dependencyManager";
import { cleanupOutputDir, createOutputDir } from "../../helpers/file";
import {
  runWithWorker,
  writeSplitsToDisk,
} from "../../splitRunner/splitRunner";
import { localConfigSchema } from "../../config/localConfig";

export async function split(napiConfig: z.infer<typeof localConfigSchema>) {
  console.time("split command");

  // Get the dependency tree
  const dependencyTreeManager = new DependencyTreeManager(
    napiConfig.entrypoint,
  );

  const outputDir = napiConfig.out;

  // Clean up and prepare the output directory
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

  writeSplitsToDisk(outputDir, napiConfig.entrypoint, processedSplits);

  console.timeEnd("split command");
  return { groups, success: true };
}
