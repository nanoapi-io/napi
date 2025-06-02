import generateHandler from "./generate.ts";
import viewHandler from "./view.ts";
import type { Argv, InferredOptionTypes } from "yargs";
import type { globalOptions } from "../../index.ts";
import { napiConfigMiddleware } from "../../middlewares/napiConfig.ts";

function builder(
  yargs: Argv<
    InferredOptionTypes<typeof globalOptions>
  >,
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .command(generateHandler)
    .command(viewHandler)
    .demandCommand(1, "You need to specify a valid command");
}

function handler() {
  // do nothing, we are handling the subcommands
}

export default {
  command: "manifest",
  describe: "generate a manifest for your program",
  builder,
  handler,
};
