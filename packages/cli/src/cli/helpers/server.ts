import { exec } from "node:child_process";
import express from "npm:express";
import type z from "npm:zod";
import type { localConfigSchema } from "../../config/localConfig.ts";
import { getApi } from "../../api/index.ts";
import process from "node:process";
import { getFrontentApp } from "../../frontend/index.ts";

function findAvailablePort(port: number): Promise<number> {
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

  // Keep last to handle SPA routing
  const frontentApp = getFrontentApp();
  app.use(frontentApp);

  const port = await findAvailablePort(3000);
  app.listen(port, () => {
    const url = `http://localhost:${port}/${route}`;
    console.info("Press Ctrl+C to stop the server");
    console.info(`Server started at ${url}`);
    if (process.env.NODE_ENV !== "development") {
      openInBrowser(url);
    }
  });
}
