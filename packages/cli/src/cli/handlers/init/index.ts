import {
  createConfig,
  getConfigFromWorkDir,
} from "../../../config/localConfig.ts";
import type { ArgumentsCamelCase, InferredOptionTypes } from "npm:yargs";
import type { globalOptions } from "../../index.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import { generateConfig } from "./prompts.ts";
import { confirm } from "npm:@inquirer/prompts";

async function handler(
  argv: ArgumentsCamelCase<InferredOptionTypes<typeof globalOptions>>,
) {
  const startTime = Date.now();

  console.info("🚀 Initializing NanoAPI project...");
  console.info(`📁 Working directory: ${argv.workdir}`);

  trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
    message: "Init command started",
  });

  try {
    // Check if config already exists
    try {
      if (getConfigFromWorkDir(argv.workdir)) {
        console.warn("⚠️  Configuration file already exists");
        console.info(`   Found: ${argv.workdir}/.napirc`);

        const confirmOverwrite = await confirm({
          message:
            `A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
          default: false,
        });
        if (!confirmOverwrite) {
          console.info("✅ Keeping existing configuration");
          return;
        }
        console.info("🔄 Proceeding with configuration overwrite");
      }
    } catch {
      // Config doesn't exist, continue with initialization
      console.info("📝 No existing configuration found - creating new one");
    }

    console.info("");
    console.info("🔧 Starting interactive configuration...");

    // Generate the config using the interactive prompts
    const napiConfig = await generateConfig(argv.workdir);

    // Confirm and show the config
    console.info("");
    console.info("📋 Generated configuration:");
    console.info("─".repeat(50));
    console.info(JSON.stringify(napiConfig, null, 2));
    console.info("─".repeat(50));

    const confirmSave = await confirm({
      message: "Do you want to save this configuration?",
      default: true,
    });

    if (confirmSave) {
      createConfig(napiConfig, argv.workdir);
      const duration = Date.now() - startTime;
      console.info("");
      console.info("✅ Configuration saved successfully!");
      console.info(`📄 Created: ${argv.workdir}/.napirc`);
      console.info("");
      console.info("🎉 Your NanoAPI project is ready!");
      console.info("");
      console.info(`⚡ Setup completed in ${duration}ms`);
    } else {
      console.info("❌ Configuration not saved");
      console.info("   Run 'napi init' again when you're ready to configure");
    }

    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command finished",
      duration: Date.now() - startTime,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Initialization failed");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error(
      "   • Check that you have write permissions in the directory",
    );
    console.error("   • Ensure the directory exists and is accessible");
    console.error("   • Try running the command again");

    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command error",
      duration: duration,
      error: errorMessage,
    });

    Deno.exit(1);
  }
}

export default {
  command: "init",
  describe: "Initialize a NanoAPI project with interactive configuration",
  builder: {},
  handler,
};
