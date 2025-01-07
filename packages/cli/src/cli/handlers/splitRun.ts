import yargs from "yargs";
import { globalOptions } from "../helpers/options";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import { getConfigFromWorkDir } from "../../config/localConfig";
import DependencyTreeManager from "../../dependencyManager/dependencyManager";
import { cleanupOutputDir, createOutputDir } from "../../helpers/file";
import {
  runWithWorker,
  writeSplitsToDisk,
} from "../../splitRunner/splitRunner";

async function splitRunCommandHandler(
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

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.CLI_SPLIT_COMMAND, {
    message: "Split command started",
  });
  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");
    trackEvent(TelemetryEvents.CLI_SPLIT_COMMAND, {
      message: "Split command failed, missing .napirc file",
      duration: Date.now() - startTime,
    });
    return;
  }

  try {
    await splitRunCommandHandler(napiConfig.entrypoint, napiConfig.out);
  } catch (error) {
    trackEvent(TelemetryEvents.CLI_SPLIT_COMMAND, {
      message: "Split command error",
      duration: Date.now() - startTime,
      error: error,
    });
  }
}

export default {
  command: "run",
  description: "Split a program into multiple ones",
  builder: {},
  handler,
};
