import type z from "npm:zod";
import type { localConfigSchema } from "../../config/localConfig.ts";
import { getApi } from "../../api/index.ts";
import { getFrontendApp } from "../../frontend/index.ts";
import { Application } from "@oak/oak/application";
import {
  dependencyManifestExists,
} from "../../manifest/dependencyManifest/index.ts";
import type { DependencyManifest } from "@napi/shared";

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

  try {
    new Deno.Command(command, { args }).spawn();
    console.info("🌐 Opening browser...");
  } catch (error) {
    console.warn(
      `⚠️  Could not open browser automatically: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    console.info(`   Please open ${url} manually in your browser`);
  }
}

export async function runServer(
  workdir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
  dependencyManifest: DependencyManifest,
) {
  try {
    console.info("🔧 Setting up web server...");

    const app = new Application();

    const manifestExists = dependencyManifestExists(workdir, napiConfig);

    if (!manifestExists) {
      console.error("❌ No dependency manifest found");
      console.error("   Run `napi manifest generate` first.");
      Deno.exit(1);
    }

    console.info("📡 Configuring API routes...");
    const api = getApi(napiConfig, dependencyManifest);
    app.use(api.routes());

    console.info("🎨 Setting up frontend application...");
    // Keep last to handle SPA routing
    const frontendApp = getFrontendApp();
    app.use(frontendApp.routes());

    console.info("🔍 Finding available port...");
    const port = await findAvailablePort(3000);

    const url = `http://localhost:${port}`;
    console.info("");
    console.info("🎉 Server ready!");
    console.info(`📍 URL: ${url}`);
    console.info("🛑 Press Ctrl+C to stop the server");
    console.info("");

    if (Deno.env.get("NODE_ENV") !== "development") {
      openInBrowser(url);
    } else {
      console.info("🔧 Development mode: Browser will not open automatically");
    }

    console.info("⚡ Starting server...");
    app.listen({ port });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to start server");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("   • Check if another process is using the port");
    console.error("   • Verify you have permission to start a server");
    console.error("   • Try restarting your terminal");
    Deno.exit(1);
  }
}
