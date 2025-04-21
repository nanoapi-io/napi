import {
  createConfig,
  getConfigFromWorkDir,
} from "../../../config/localConfig.js";
import { ArgumentsCamelCase, InferredOptionTypes } from "yargs";
import { globalOptions } from "../../helpers/options.js";
import { TelemetryEvents, trackEvent } from "../../../telemetry.js";
import { generateConfig } from "./prompts.js";
import { confirm } from "@inquirer/prompts";

async function handler(
  argv: ArgumentsCamelCase<InferredOptionTypes<typeof globalOptions>>,
) {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
    message: "Init command started",
  });

  try {
    // Check if config already exists
    try {
      if (getConfigFromWorkDir(argv.workdir)) {
        const confirmOverwrite = await confirm({
          message: `A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
          default: false,
        });
        if (!confirmOverwrite) {
          return;
        }
      }
    } catch {
      // Config doesn't exist, continue with initialization
    }

    console.info("Generating a new .napirc configuration file...");

    // Generate the config using the interactive prompts
    const napiConfig = await generateConfig(argv.workdir);

    // Confirm and show the config
    console.info("\nGenerated configuration:");
    console.info(JSON.stringify(napiConfig, null, 2));

    const confirmSave = await confirm({
      message: "Do you want to save this configuration?",
      default: true,
    });

    if (confirmSave) {
      createConfig(napiConfig, argv.workdir);
      console.info("Successfully created .napirc");
    } else {
      console.info("Configuration not saved.");
    }

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
  describe: "Initialize a NanoAPI project with interactive configuration",
  builder: {},
  handler,
};

// Export for testing
export { generateConfig };
