import type { PositionalOptionsType } from "npm:yargs";

export const globalOptions = {
  workdir: {
    type: "string" as PositionalOptionsType,
    default: Deno.cwd(),
    alias: "wd",
    description: "working directory",
  },
};
