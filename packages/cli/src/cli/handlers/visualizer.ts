import yargs from "yargs";
import { globalOptions } from "../helpers/options";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import { getConfigFromWorkDir } from "../../config/localConfig";
import { runServer } from "../helpers/server";

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  const start = Date.now();

  trackEvent(TelemetryEvents.CLI_VISUALIZER_COMMAND, {
    message: "Visualizer command started",
  });

  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");
    trackEvent(TelemetryEvents.CLI_VISUALIZER_COMMAND, {
      message: "Visualizer command failed, missing .napirc file",
      duration: Date.now() - start,
    });
    return;
  }

  runServer(napiConfig, "visualizer");

  trackEvent(TelemetryEvents.CLI_VISUALIZER_COMMAND, {
    message: "Visualizer command finished",
    duration: Date.now() - start,
  });
}

export default {
  command: "visualizer",
  describe: "Configure napi split your program with the UI",
  builder: {},
  handler,
};
