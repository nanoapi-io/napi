import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getApi } from "./api";
import annotateOpenAICommandHandler from "./commands/annotate";
import initCommandHandler from "./commands/init";
import splitCommandHandler from "./commands/split";
import { getConfigFromWorkDir, getOpenaiApiKeyFromConfig } from "./config";
import { findAvailablePort, openInBrowser } from "./helper/server";
import { TelemetryEvents, trackEvent } from "./telemetry";

// remove all warning.
// We need this because of some depreciation warning we have with 3rd party libraries
// Only on production so we still have them on devlopment
if (process.env.NODE_ENV !== "development") {
  process.removeAllListeners("warning");
}

if (process.env.NAPI_DISABLE_TELEMETRY !== "true") {
  trackEvent(TelemetryEvents.APP_START, {
    message: "Napi started with Telemetry enabled",
  });
}

yargs(hideBin(process.argv))
  .options({
    workdir: {
      type: "string",
      default: process.cwd(),
      alias: "wd",
      description: "working directory",
    },
  })
  .command(
    "init",
    "initialize a nanoapi project",
    (yargs) => yargs,
    (argv) => {
      trackEvent(TelemetryEvents.INIT_COMMAND, { message: "Init command" });
      initCommandHandler(argv.workdir);
    },
  )
  // Annotate openai command
  .command(
    "annotate openai [entrypoint]",
    "Annotate a program, needed for splitting",
    (yargs) =>
      yargs.options({
        apiKey: {
          type: "string",
          default: "",
          alias: "k",
          description: "OpenAI API key",
        },
      }),
    (argv) => {
      trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
        message: "Annotate command",
      });
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
    (yargs) => yargs,
    (argv) => {
      trackEvent(TelemetryEvents.SPLIT_COMMAND, {
        message: "Split command",
      });
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
    (yargs) => yargs,
    async (argv) => {
      trackEvent(TelemetryEvents.UI_OPEN, {
        message: "UI command",
      });

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
        console.info(`Server started at ${url}`);
        console.info("Press Ctrl+C to stop the server");
        openInBrowser(url);
      });
    },
  )
  .parse();
