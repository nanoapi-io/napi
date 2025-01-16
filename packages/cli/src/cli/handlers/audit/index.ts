import viewHandler from "./view";
import yargs from "yargs";
import { globalOptions } from "../../helpers/options";

function builder(
  yargs: yargs.Argv<
    yargs.Omit<object, "workdir"> &
      yargs.InferredOptionTypes<typeof globalOptions>
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
