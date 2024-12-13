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
import { checkVersionMiddleware } from "./helper/checkNpmVersion";

// remove all warning.
// We need this because of some depreciation warning we have with 3rd party libraries
// Only on production so we still have them on devlopment
if (process.env.NODE_ENV !== "development") {
  process.removeAllListeners("warning");
}

trackEvent(TelemetryEvents.APP_START, {
  message: "Napi started",
});

yargs(hideBin(process.argv))
  .middleware(() => {
    checkVersionMiddleware();
  })
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
      const startTime = Date.now();
      trackEvent(TelemetryEvents.INIT_COMMAND, {
        message: "Init command started",
      });
      try {
        initCommandHandler(argv.workdir);
        trackEvent(TelemetryEvents.INIT_COMMAND, {
          message: "Init command finished",
          duration: Date.now() - startTime,
        });
      } catch (error) {
        trackEvent(TelemetryEvents.INIT_COMMAND, {
          message: "Init command error",
          duration: Date.now() - startTime,
          error: error,
        });
        throw error;
      }
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
      const startTime = Date.now();
      trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
        message: "Annotate command started",
      });
      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
          message: "Annotate command failed, missing .napirc file",
          duration: Date.now() - startTime,
        });
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
        trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
          message: "Annotate command failed, missing OpenAI API key",
          duration: Date.now() - startTime,
        });
        return;
      }

      try {
        annotateOpenAICommandHandler(napiConfig.entrypoint, apiKey);
        trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
          message: "Annotate command finished",
          duration: Date.now() - startTime,
        });
      } catch (error) {
        trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
          message: "Annotate command error",
          duration: Date.now() - startTime,
          error: error,
        });
      }
    },
  )
  // Split command
  .command(
    "split [entrypoint]",
    "Split a program into multiple ones",
    (yargs) => yargs,
    (argv) => {
      const startTime = Date.now();
      trackEvent(TelemetryEvents.SPLIT_COMMAND, {
        message: "Split command started",
      });
      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        trackEvent(TelemetryEvents.SPLIT_COMMAND, {
          message: "Split command failed, missing .napirc file",
          duration: Date.now() - startTime,
        });
        return;
      }

      try {
        splitCommandHandler(napiConfig.entrypoint, napiConfig.out);
      } catch (error) {
        trackEvent(TelemetryEvents.SPLIT_COMMAND, {
          message: "Split command error",
          duration: Date.now() - startTime,
          error: error,
        });
      }
    },
  )
  // Open UI command
  .command(
    "ui",
    "open the NanoAPI UI",
    (yargs) => yargs,
    async (argv) => {
      const start = Date.now();

      trackEvent(TelemetryEvents.UI_OPEN, {
        message: "UI command started",
      });

      const napiConfig = getConfigFromWorkDir(argv.workdir);

      if (!napiConfig) {
        console.error("Missing .napirc file in project. Run `napi init` first");
        trackEvent(TelemetryEvents.UI_OPEN, {
          message: "UI command failed, missing .napirc file",
          duration: Date.now() - start,
        });
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
        if (process.env.NODE_ENV !== "development") {
          openInBrowser(url);
        }
      });

      trackEvent(TelemetryEvents.UI_OPEN, {
        message: "UI command finished",
        duration: Date.now() - start,
      });
    },
  )
  .parse();
