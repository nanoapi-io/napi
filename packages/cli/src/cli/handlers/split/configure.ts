import yargs from "yargs";
import { globalOptions } from "../../helpers/options";
import { TelemetryEvents, trackEvent } from "../../../telemetry";
import { getConfigFromWorkDir } from "../../../config/localConfig";
import { runServer } from "../../helpers/server";

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  const start = Date.now();

  trackEvent(TelemetryEvents.CLI_SPLIT_CONFIGURE_COMMAND, {
    message: "Split configure command started",
  });

  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");
    trackEvent(TelemetryEvents.CLI_SPLIT_CONFIGURE_COMMAND, {
      message: "Split configure command failed, missing .napirc file",
      duration: Date.now() - start,
    });
    return;
  }

  runServer(napiConfig, "splitConfigure");

  trackEvent(TelemetryEvents.CLI_SPLIT_CONFIGURE_COMMAND, {
    message: "Split configure command finished",
    duration: Date.now() - start,
  });
}

export default {
  command: "configure",
  describe: "Configure napi split your program with the UI",
  builder: {},
  handler,
};
