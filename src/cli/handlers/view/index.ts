import type { Arguments } from "yargs-types";
import type { z } from "zod";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import {
  type localConfigSchema,
  napiConfigMiddleware,
} from "../../middlewares/napiConfig.ts";
import { dirname, fromFileUrl, join } from "@std/path";
import { generateAuditManifest } from "../../../manifest/auditManifest/index.ts";
import {
  type AuditConfig,
  defaultAuditConfig,
} from "../../../manifest/auditManifest/types.ts";
import type { DependencyManifest } from "../../../manifest/dependencyManifest/types.ts";

const NAPI_DIR = ".napi";
const MANIFESTS_DIR = "manifests";

interface ManifestEnvelope {
  id: string;
  branch: string;
  commitSha: string;
  commitShaDate: string;
  createdAt: string;
  manifest: DependencyManifest;
}

interface ManifestListItem {
  id: string;
  branch: string;
  commitSha: string;
  commitShaDate: string;
  createdAt: string;
  fileCount: number;
}

function getManifestsDir(workdir: string): string {
  return join(workdir, NAPI_DIR, MANIFESTS_DIR);
}

function listManifests(workdir: string): ManifestListItem[] {
  const manifestsDir = getManifestsDir(workdir);
  const items: ManifestListItem[] = [];

  try {
    for (const entry of Deno.readDirSync(manifestsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue;

      try {
        const content = Deno.readTextFileSync(join(manifestsDir, entry.name));
        const envelope = JSON.parse(content) as ManifestEnvelope;
        items.push({
          id: envelope.id,
          branch: envelope.branch,
          commitSha: envelope.commitSha,
          commitShaDate: envelope.commitShaDate,
          createdAt: envelope.createdAt,
          fileCount: Object.keys(envelope.manifest).length,
        });
      } catch {
        // Skip malformed manifest files
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

function loadManifest(
  workdir: string,
  manifestId: string,
): ManifestEnvelope | null {
  const manifestPath = join(
    getManifestsDir(workdir),
    `${manifestId}.json`,
  );
  try {
    const content = Deno.readTextFileSync(manifestPath);
    return JSON.parse(content) as ManifestEnvelope;
  } catch {
    return null;
  }
}

function getViewerDistDir(): string {
  const thisDir = dirname(fromFileUrl(import.meta.url));
  return join(thisDir, "..", "..", "..", "..", "viewer", "dist");
}

function getContentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

async function tryServeStatic(
  viewerDir: string,
  pathname: string,
): Promise<Response | null> {
  let filePath = join(viewerDir, pathname);

  try {
    const stat = Deno.statSync(filePath);
    if (stat.isDirectory) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    // File doesn't exist
  }

  try {
    const content = await Deno.readFile(filePath);
    return new Response(content, {
      headers: { "content-type": getContentType(filePath) },
    });
  } catch {
    return null;
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

async function openBrowser(url: string) {
  try {
    let cmd: string[];
    if (Deno.build.os === "darwin") {
      cmd = ["open", url];
    } else if (Deno.build.os === "windows") {
      cmd = ["cmd", "/c", "start", url];
    } else {
      cmd = ["xdg-open", url];
    }
    const command = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "null",
      stderr: "null",
    });
    const child = command.spawn();
    await child.status;
  } catch {
    // Silently fail if browser can't be opened
  }
}

function findAvailablePort(startPort: number): number {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      const listener = Deno.listen({ port });
      listener.close();
      return port;
    } catch {
      continue;
    }
  }
  throw new Error("No available port found");
}

function mergeAuditConfig(
  userAudit?: z.infer<typeof localConfigSchema>["audit"],
): AuditConfig {
  return {
    file: {
      ...defaultAuditConfig.file,
      ...userAudit?.file,
    },
    symbol: {
      ...defaultAuditConfig.symbol,
      ...userAudit?.symbol,
    },
  };
}

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .option("port", {
      type: "number",
      description: "Port to serve the viewer on",
      default: 3000,
    });
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
    napiConfig: z.infer<typeof localConfigSchema>;
  } & {
    port: number;
  },
) {
  const workdir = argv.workdir as string;
  const viewerDir = getViewerDistDir();
  const auditConfig = mergeAuditConfig(argv.napiConfig?.audit);

  const port = findAvailablePort(argv.port);

  const handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/manifests" && request.method === "GET") {
      const manifests = listManifests(workdir);
      return jsonResponse(manifests);
    }

    const manifestDetailMatch = pathname.match(
      /^\/api\/manifests\/([^/]+)$/,
    );
    if (manifestDetailMatch && request.method === "GET") {
      const manifestId = manifestDetailMatch[1];
      const envelope = loadManifest(workdir, manifestId);
      if (!envelope) {
        return jsonResponse({ error: "Manifest not found" }, 404);
      }
      return jsonResponse(envelope);
    }

    const auditMatch = pathname.match(
      /^\/api\/manifests\/([^/]+)\/audit$/,
    );
    if (auditMatch && request.method === "GET") {
      const manifestId = auditMatch[1];
      const envelope = loadManifest(workdir, manifestId);
      if (!envelope) {
        return jsonResponse({ error: "Manifest not found" }, 404);
      }
      const auditManifest = generateAuditManifest(
        envelope.manifest,
        auditConfig,
      );
      return jsonResponse(auditManifest);
    }

    // Serve static files from viewer dist
    const staticResponse = await tryServeStatic(viewerDir, pathname);
    if (staticResponse) return staticResponse;

    // SPA fallback: serve index.html for any unmatched route
    const indexResponse = await tryServeStatic(viewerDir, "/index.html");
    if (indexResponse) return indexResponse;

    return new Response("Not Found", { status: 404 });
  };

  console.info(`🚀 Starting napi viewer...`);
  console.info(
    `📂 Serving manifests from: ${join(workdir, NAPI_DIR, MANIFESTS_DIR)}`,
  );
  console.info(`🌐 Open: http://localhost:${port}`);
  console.info(`\nPress Ctrl+C to stop.\n`);

  await openBrowser(`http://localhost:${port}`);

  Deno.serve({ port }, handler);
}

export default {
  command: "view",
  describe: "open the dependency visualizer in your browser",
  builder,
  handler,
};
