import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Compiler } from "./compiler";

const argv = yargs(hideBin(process.argv))
  .options({
    entrypoint: {
      type: "string",
      demandOption: true,
      alias: "e",
      description: "Entrypoint file",
    },
    targetDir: {
      type: "string",
      default: "",
      alias: "t",
      description: "Target directory",
    },
    output: {
      type: "string",
      default: process.cwd(),
      alias: "out",
      description: "Output directory",
    },
  })
  .parseSync();

const compiler = new Compiler(argv.entrypoint, argv.targetDir, argv.output);
compiler.run();
