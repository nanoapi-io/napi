import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { checkVersionMiddleware } from "./helpers/checkNpmVersion";
import { globalOptions } from "./helpers/options";
import initCommand from "./handlers/init";
import splitRunHandler from "./handlers/splitRun";
import splitAnnotateHandler from "./handlers/splitAnnotate";
import splitConfigureHandler from "./handlers/splitConfigure";
import visualizerHandler from "./handlers/visualizer";
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
    .command({
      command: "split",
      describe: "split your program",
      builder: (yargs) => {
        return yargs
          .command(splitAnnotateHandler)
          .command(splitConfigureHandler)
          .command(splitRunHandler)
          .demandCommand(1, "You need to specify a valid command");
      },
      handler: () => {
        // do nothing, we are handling the subcommands
      },
    })
    .command(visualizerHandler)
    .parse();
}
