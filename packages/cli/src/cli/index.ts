import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkVersionMiddleware } from "./helpers/checkNpmVersion";
import { globalOptions } from "./helpers/options";
import initCommand from "./handlers/init";
import splitHandler from "./handlers/split";
import splitAnnotateHandler from "./handlers/splitAnnotate";
import splitConfigureHandler from "./handlers/splitConfigure";
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
    .command(splitHandler)
    .command(splitAnnotateHandler)
    .command(splitConfigureHandler)
    .parse();
}
