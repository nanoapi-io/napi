import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getApi } from "./api";
import annotateOpenAICommandHandler from "./commands/annotate";
import splitCommandHandler from "./commands/split";
import { findAvailablePort, openInBrowser } from "./helper/server";
import initCommandHandler from "./commands/init";
import { getConfigFromWorkDir, getOpenaiApiKeyFromConfig } from "./config";

yargs(hideBin(process.argv))
  // Global options, used for all commands
  .options({
    workdir: {
      type: "string",
      default: process.cwd(),
      alias: "wd",
      description: "working directory",
    },
  })
  // Init command
  .command(
    "init",
    "initialize a nanoapi project",
    (yargs) => yargs,
    (argv) => {
      initCommandHandler(argv.workdir);
    },
  )
  // Annotate openai command
  .command(
    "annotate openai [entrypoint]",
    "Annotate a program, needed for splitting",
    (yargs) => {
      return yargs.options({
        apiKey: {
          type: "string",
          default: "",
          alias: "k",
          description: "OpenAI API key",
        },
      });
    },
    (argv) => {
      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        return;
      }

      let apiKey: string | undefined;
      if (argv.apiKey) {
        apiKey = argv.apiKey;
      } else if (napiConfig) {
        apiKey = getOpenaiApiKeyFromConfig(argv.workdir, napiConfig);
      }

      if (!apiKey) {
        console.error(
          "Missing OpenAI API key. Please provide it via --apiKey or in a .napirc file using 'openaiApiKey' or 'openaiApiKeyFilePath'",
        );
        return;
      }

      annotateOpenAICommandHandler(napiConfig.entrypoint, apiKey);
    },
  )
  // Split command
  .command(
    "split [entrypoint]",
    "Split a program into multiple ones",
    (yargs) => {
      return yargs;
    },
    (argv) => {
      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        return;
      }

      splitCommandHandler(napiConfig.entrypoint, napiConfig.out);
    },
  )
  // Open UI command
  .command(
    "ui",
    "open the NanoAPI UI",
    (yargs) => {
      return yargs;
    },
    async (argv) => {
      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        return;
      }

      const app = express();

      const api = getApi(napiConfig);

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
        openInBrowser(url);
      });
    },
  )
  .parse();
