import generateHandler from "./generate.ts";
import type { Arguments } from "yargs-types";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import type { z } from "zod";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .command(generateHandler)
    .demandCommand(1, "You need to specify a valid command");
}

export default {
  command: "manifest",
  describe: "generate a manifest for your program",
  builder,
  handler: () => {},
};
