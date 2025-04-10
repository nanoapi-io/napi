import { exec } from "child_process";
import express from "express";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { getApi } from "../../api";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";

async function findAvailablePort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = express().listen(port, () => {
      server.close(() => {
        resolve(port);
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(findAvailablePort(port + 1));
      } else {
        reject(err);
      }
    });
  });
}

function openInBrowser(url: string) {
  let start = "";
  if (process.platform === "darwin") {
    start = "open";
  } else if (process.platform === "win32") {
    start = "start";
  } else {
    start = "xdg-open";
  }
  exec(`${start} ${url}`);
}

export async function runServer(
  workdir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
  route: string,
) {
  const app = express();
  const api = getApi(workdir, napiConfig);
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
    app.use(express.static(path.join(__dirname, "../../../app_dist")));
  }

  const port = await findAvailablePort(3000);
  app.listen(port, () => {
    const url = `http://localhost:${port}#/${route}`;
    console.info("Press Ctrl+C to stop the server");
    if (process.env.NODE_ENV !== "development") {
      openInBrowser(url);
    } else {
      console.info(`Server started at ${url}`);
    }
  });
}
