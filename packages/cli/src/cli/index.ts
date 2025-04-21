import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkVersionMiddleware } from "./helpers/checkNpmVersion.js";
import { globalOptions } from "./helpers/options.js";
import initCommand from "./handlers/init/index.js";
import auditCommand from "./handlers/audit/index.js";
import { TelemetryEvents, trackEvent } from "../telemetry.js";

export function initCli() {
  trackEvent(TelemetryEvents.APP_START, {
    message: "Napi started",
  });

  yargs(hideBin(process.argv))
    .scriptName("napi")
    .middleware(async () => {
      await checkVersionMiddleware();
    })
    .options(globalOptions)
    .command(initCommand)
    .command(auditCommand)
    .parse();
}
