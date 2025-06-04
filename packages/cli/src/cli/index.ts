import yargs, { type PositionalOptionsType } from "yargs";
import {
  checkVersionMiddleware,
  getCurrentVersion,
} from "./middlewares/checkVersion.ts";
import initCommand from "./handlers/init/index.ts";
import manifestCommand from "./handlers/manifest/index.ts";
import extractCommand from "./handlers/extract/index.ts";
import { TelemetryEvents, trackEvent } from "../telemetry.ts";

export const globalOptions = {
  workdir: {
    type: "string" as PositionalOptionsType,
    default: Deno.cwd(),
    alias: "wd",
    description: "working directory",
  },
  host: {
    type: "string" as PositionalOptionsType,
    default: "https://api.nanoapi.io",
    alias: "h",
    description: "NanoAPI host",
  },
};

export function initCli() {
  trackEvent(TelemetryEvents.CLI_START, {
    message: "Napi started",
  });

  yargs(Deno.args)
    .scriptName("napi")
    .usage("Usage: $0 <command> [options]")
    .middleware(checkVersionMiddleware)
    .options(globalOptions)
    .command(initCommand)
    .command(manifestCommand)
    .command(extractCommand)
    .demandCommand(1, "You need to specify a command")
    .strict()
    .help()
    .alias("help", "h")
    .version(getCurrentVersion())
    .alias("version", "v")
    .epilogue("For more information, visit https://github.com/nanoapi-io/napi")
    .parse();
}
