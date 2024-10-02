import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Compiler } from "./compiler";
import { a } from "vitest/dist/chunks/suite.CcK46U-P";

const argv = yargs(hideBin(process.argv))
  .options({
    entrypoint: {
      type: "string",
      demandOption: true,
      alias: "e",
      description: "Entrypoint file",
    },
    excludeDirs: {
      type: "array",
      default: ["node_modules"],
      alias: "exclude",
      description: "Directories to exclude from the dependency tree",
    },
    output: {
      type: "string",
      default: process.cwd(),
      alias: "out",
      description: "Output directory",
    },
  })
  .parseSync();

const compiler = new Compiler(
  argv.entrypoint,
  argv.excludeDirs as string[],
  argv.output
);
compiler.run();
