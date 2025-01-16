import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkVersionMiddleware } from "./helpers/checkNpmVersion";
import { globalOptions } from "./helpers/options";
import initCommand from "./handlers/init";
import splitCommand from "./handlers/split/index";
import auditCommand from "./handlers/audit/index";
import { TelemetryEvents, trackEvent } from "../telemetry";

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
    .command(splitCommand)
    .command(auditCommand)
    .parse();
}
