import type z from "npm:zod";
import type { localConfigSchema } from "../../config/localConfig.ts";
import { getApi } from "../../api/index.ts";
import { getFrontendApp } from "../../frontend/index.ts";
import { Application } from "@oak/oak/application";

function findAvailablePort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const listener = Deno.listen({ port });
      listener.close();
      resolve(port);
    } catch (err) {
      if (err instanceof Deno.errors.AddrInUse) {
        // Port is in use, try the next one
        resolve(findAvailablePort(port + 1));
      } else {
        reject(err);
      }
    }
  });
}

function openInBrowser(url: string) {
  let command = "";
  let args: string[] = [];

  if (Deno.build.os === "darwin") {
    command = "open";
    args = [url];
  } else if (Deno.build.os === "windows") {
    command = "cmd";
    args = ["/c", "start", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  new Deno.Command(command, { args }).spawn();
}

export async function runServer(
  workdir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
  route: string,
) {
  const app = new Application();
  const api = getApi(workdir, napiConfig);
  app.use(api.routes());

  // Keep last to handle SPA routing
  const frontendApp = getFrontendApp();
  app.use(frontendApp.routes());

  const port = await findAvailablePort(3000);

  const url = `http://localhost:${port}/${route}`;
  console.info("Press Ctrl+C to stop the server");
  console.info(`Server started at ${url}`);
  if (Deno.env.get("NODE_ENV") !== "development") {
    openInBrowser(url);
  }

  app.listen({ port });
}
