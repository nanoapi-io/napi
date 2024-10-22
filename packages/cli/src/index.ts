import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import api from "./api";
import annotateOpenAICommandHandler from "./commands/annotate";
import splitCommandHandler from "./commands/split";
import { findAvailablePort, openInBrowser } from "./helper/server";

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
    async () => {
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

      const port = await findAvailablePort(3000);
      app.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`Server started at ${url}`);
        console.log("Press Ctrl+C to stop the server");
        if (process.env.NODE_ENV !== "development") {
          openInBrowser(url);
        }
      });
    },
  )
  .parse();
