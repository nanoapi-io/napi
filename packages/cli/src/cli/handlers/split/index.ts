import runHandler from "./run";
import annotateHandler from "./annotate";
import configureHandler from "./configure";
import yargs from "yargs";
import { globalOptions } from "../../helpers/options";

function builder(
  yargs: yargs.Argv<
    yargs.Omit<object, "workdir"> &
      yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  return yargs
    .command(annotateHandler)
    .command(configureHandler)
    .command(runHandler)
    .demandCommand(1, "You need to specify a valid command");
}

function handler() {
  // do nothing, we are handling the subcommands
}

export default {
  command: "split",
  describe: "split your program",
  builder,
  handler,
};
