import fs from "fs";
import path from "path";
import prompts from "prompts";
import z from "zod";
import {
  createConfig,
  getConfigFromWorkDir,
  localConfigSchema,
} from "../../config/localConfig";
import yargs from "yargs";
import { globalOptions } from "../helpers/options";
import { TelemetryEvents, trackEvent } from "../../telemetry";

async function promptForEntryPointPath(currentPath: string) {
  // Read the current directory's contents
  const items = fs.readdirSync(currentPath).map((item) => {
    const fullPath = path.join(currentPath, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    return { title: item + (isDir ? "/" : ""), value: fullPath, isDir };
  });

  // Add an option to go up a directory
  if (currentPath !== path.parse(currentPath).root) {
    items.unshift({
      title: "../",
      value: path.join(currentPath, ".."),
      isDir: true,
    });
  }

  // Ask user to select a file or directory
  const response = await prompts({
    type: "select",
    name: "selectedPath",
    message: `Select the entrypoint file of your application\nNavigate through: ${currentPath}`,
    choices: items,
  });

  // If the user selected a directory, navigate into it
  if (
    response.selectedPath &&
    fs.statSync(response.selectedPath).isDirectory()
  ) {
    return promptForEntryPointPath(response.selectedPath);
  }

  // Return the file path if a file is selected
  return response.selectedPath;
}

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
    message: "Init command started",
  });
  try {
    if (getConfigFromWorkDir(argv.workdir)) {
      const response = await prompts({
        type: "confirm",
        name: "confirm",
        message: `A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
        initial: false,
      });
      if (!response.confirm) {
        return;
      }
    }

    const absoluteFilePath = await promptForEntryPointPath(argv.workdir);
    const relativeFilePath = path.relative(argv.workdir, absoluteFilePath);

    const napiConfig: z.infer<typeof localConfigSchema> = {
      entrypoint: relativeFilePath,
      out: "napi_dist",
    };

    createConfig(napiConfig, argv.workdir);

    console.info("Successfully created .napirc");
    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command finished",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command error",
      duration: Date.now() - startTime,
      error: error,
    });
    throw error;
  }
}

export default {
  command: "init",
  describe: "initialize a NanoAPI project",
  builder: {},
  handler,
};
