import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import splitCommandHandler from "./commands/split";
import path from "path";
import annotateOpenAICommandHandler from "./commands/annotate";
import express from "express";
import api from "./api";
import { createProxyMiddleware } from "http-proxy-middleware";

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
          targetDir: {
            type: "string",
            default: "",
            alias: "t",
            description: "Target directory",
          },
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
      const targetDir = argv.targetDir
        ? path.resolve(argv.targetDir)
        : path.dirname(entrypoint);

      annotateOpenAICommandHandler(entrypoint, targetDir, argv.apiKey);
    }
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
    }
  )
  .command(
    "ui",
    "open the NanoAPI UI",
    (yargs) => {
      return yargs;
    },
    (argv) => {
      // TODO serve the static file from the app_dist folder

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
          })
        );
      } else {
        app.use(express.static(path.join(__dirname, "app_dist")));
      }

      app.listen(3000, () => {
        // TODO nice message and instruction on how to close the server
        console.log("Server started at http://localhost:3000");
        console.log("Press Ctrl+C to stop the server");
      });
    }
  )
  .parse();
