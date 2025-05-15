import yargs from "npm:yargs";
import {
  checkVersionMiddleware,
  getCurrentVersion,
} from "./helpers/checkVersion.ts";
import { globalOptions } from "./helpers/options.ts";
import initCommand from "./handlers/init/index.ts";
import auditCommand from "./handlers/audit/index.ts";
import { TelemetryEvents, trackEvent } from "../telemetry.ts";

export function initCli() {
  trackEvent(TelemetryEvents.APP_START, {
    message: "Napi started",
  });

  yargs(Deno.args)
    .scriptName("napi")
    .usage("Usage: $0 <command> [options]")
    .middleware(async () => {
      await checkVersionMiddleware();
    })
    .options(globalOptions)
    .command(initCommand)
    .command(auditCommand)
    .demandCommand(1, "You need to specify a command")
    .strict()
    .help()
    .alias("help", "h")
    .version(getCurrentVersion())
    .alias("version", "v")
    .epilogue("For more information, visit https://github.com/nanoapi-io/napi")
    .parse();
}
