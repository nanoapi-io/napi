import { PositionalOptionsType } from "yargs";

export const globalOptions = {
  workdir: {
    type: "string" as PositionalOptionsType,
    default: process.cwd(),
    alias: "wd",
    description: "working directory",
  },
};
