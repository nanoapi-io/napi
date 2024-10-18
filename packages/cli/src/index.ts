import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import api from "./api";
import annotateOpenAICommandHandler from "./commands/annotate";
import splitCommandHandler from "./commands/split";

yargs(hideBin(process.argv))
  .command(
    "annotate openai [entrypoint]",
    "Annotate a program, needed for splitting",
    (yargs) => {
      return yargs
        .positional("entrypoint", {
          describe: "Entrypoint file",
          type: "string",
        })
        .options({
          apiKey: {
            type: "string",
            default: "",
            alias: "k",
            description: "OpenAI API key",
          },
        });
    },
    (argv) => {
      if (!argv.entrypoint) {
        console.error("Missing entrypoint file");
        process.exit(1);
      }
      if (!argv.apiKey) {
        console.error("Missing OpenAI API key");
        process.exit(1);
      }
      const entrypoint = path.resolve(argv.entrypoint);

      annotateOpenAICommandHandler(entrypoint, argv.apiKey);
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
      const outputDir = argv.output ? path.resolve(argv.output) : process.cwd();

      splitCommandHandler(entrypoint, outputDir);
    },
  )
  .command(
    "ui",
    "open the NanoAPI UI",
    (yargs) => {
      return yargs;
    },
    () => {
      console.log("Opening NanoAPI UI");

      const app = express();

      app.use(api);

      if (process.env.NODE_ENV === "development") {
        const targetServiceUrl =
          process.env.APP_SERVICE_URL || "http://localhost:3001";

        app.use(
          "/",
          createProxyMiddleware({
            target: targetServiceUrl,
            changeOrigin: true,
          }),
        );
      } else {
        app.use(express.static(path.join(__dirname, "../dist/app_dist")));
      }

      app.listen(3000, () => {
        // TODO nice message and instruction on how to close the server
        console.log("Server started at http://localhost:3000");
        console.log("Press Ctrl+C to stop the server");
      });
    },
  )
  .parse();
