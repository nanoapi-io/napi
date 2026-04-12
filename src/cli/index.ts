import yargs from "yargs";
import {
  checkVersionMiddleware,
  getCurrentVersion,
} from "./middlewares/checkVersion.ts";
import initCommand from "./handlers/init/index.ts";
import setCommand from "./handlers/set/index.ts";
import generateCommand from "./handlers/generate/index.ts";
import viewCommand from "./handlers/view/index.ts";
import extractCommand from "./handlers/extract/index.ts";
import { globalConfigMiddleware } from "./middlewares/globalConfig.ts";

export const globalOptions = {
  workdir: {
    type: "string",
    default: Deno.cwd(),
    alias: "wd",
    description: "working directory",
  },
};

export function initCli() {
  yargs(Deno.args)
    .scriptName("napi")
    .usage("Usage: $0 <command> [options]")
    .options(globalOptions)
    .middleware(checkVersionMiddleware)
    .middleware(globalConfigMiddleware)
    .command(initCommand)
    .command(setCommand)
    .command(generateCommand)
    .command(viewCommand)
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
