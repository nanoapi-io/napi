import viewHandler from "./view.ts";
import type { Argv, InferredOptionTypes } from "npm:yargs";
import type { globalOptions } from "../../helpers/options.ts";

function builder(
  yargs: Argv<
    Omit<object, "workdir"> & InferredOptionTypes<typeof globalOptions>
  >,
) {
  return yargs
    .command(viewHandler)
    .demandCommand(1, "You need to specify a valid command");
}

function handler() {
  // do nothing, we are handling the subcommands
}

export default {
  command: "audit",
  describe: "audit your program",
  builder,
  handler,
};
