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

  trackEvent(TelemetryEvents.UI_OPEN, {
    message: "UI command started",
  });

  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");
    trackEvent(TelemetryEvents.UI_OPEN, {
      message: "UI command failed, missing .napirc file",
      duration: Date.now() - start,
    });
    return;
  }

  runServer(napiConfig, "splitConfigure");

  trackEvent(TelemetryEvents.UI_OPEN, {
    message: "UI command finished",
    duration: Date.now() - start,
  });
}

export default {
  command: "split configure",
  describe: "Configure napi split your program with the UI",
  builder: {},
  handler,
};
