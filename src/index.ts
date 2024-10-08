import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import splitCommandHandler from "./commands/split";
import path from "path";
import { annotateCommandHandler } from "./commands/annotate";

yargs(hideBin(process.argv))
  .command(
    "annotate [entrypoint]",
    "Annotate a program, needed for splitting",
    (yargs) => {
      return yargs
        .positional("entrypoint", {
          describe: "Entrypoint file",
          type: "string",
        })
        .options({
          targetDir: {
            type: "string",
            default: "",
            alias: "t",
            description: "Target directory",
          },
        });
    },
    (argv) => {
      if (!argv.entrypoint) {
        console.error("Missing entrypoint file");
        process.exit(1);
      }
      const entrypoint = path.resolve(argv.entrypoint);
      const targetDir = argv.targetDir
        ? path.resolve(argv.targetDir)
        : path.dirname(entrypoint);

      annotateCommandHandler(entrypoint, targetDir);
    },
  )
  .command(
    "split [entrypoint]",
    "Split a program into multiple ones",
    (yargs) => {
      return yargs
        .positional("entrypoint", {
          describe: "Entrypoint file",
          type: "string",
        })
        .options({
          targetDir: {
            type: "string",
            default: "",
            alias: "t",
            description: "Target directory",
          },
          output: {
            type: "string",
            default: "",
            alias: "out",
            description: "Output directory",
          },
        });
    },
    (argv) => {
      if (!argv.entrypoint) {
        console.error("Missing entrypoint file");
        process.exit(1);
      }
      const entrypoint = path.resolve(argv.entrypoint);
      const targetDir = argv.targetDir
        ? path.resolve(argv.targetDir)
        : path.dirname(entrypoint);
      const outputDir = argv.output ? path.resolve(argv.output) : process.cwd();

      splitCommandHandler(entrypoint, targetDir, outputDir);
    },
  )
  .parse();
