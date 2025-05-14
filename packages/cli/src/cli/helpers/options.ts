import type { PositionalOptionsType } from "npm:yargs";
import process from "node:process";

export const globalOptions = {
  workdir: {
    type: "string" as PositionalOptionsType,
    default: process.cwd(),
    alias: "wd",
    description: "working directory",
  },
};
