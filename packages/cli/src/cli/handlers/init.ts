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

    const napiConfig: z.infer<typeof localConfigSchema> = {
      audit: {
        language: "python",
      },
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
