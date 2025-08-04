import apiKeyHandler from "./apiKey.ts";
import type { Arguments } from "yargs-types";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import type { z } from "zod";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .command(apiKeyHandler)
    .demandCommand(1, "You need to specify a valid command");
}

export default {
  command: "set",
  describe: "set a value in the global config",
  builder,
  handler: () => {},
};
