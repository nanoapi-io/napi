import yargs from "yargs";
import { hideBin } from "yargs/helpers";
// import { checkVersionMiddleware } from "./helpers/checkNpmVersion.ts";
import { globalOptions } from "./helpers/options.ts";
import initCommand from "./handlers/init/index.ts";
import auditCommand from "./handlers/audit/index.ts";
import { TelemetryEvents, trackEvent } from "../telemetry.ts";
import process from "node:process";

export function initCli() {
  trackEvent(TelemetryEvents.APP_START, {
    message: "Napi started",
  });

  yargs(hideBin(process.argv))
    .scriptName("napi")
    // .middleware(async () => {
    //   await checkVersionMiddleware();
    // })
    .options(globalOptions)
    .command(initCommand)
    .command(auditCommand)
    .parse();
}
