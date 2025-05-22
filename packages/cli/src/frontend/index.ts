import { Router } from "@oak/oak/router";
import type { Context } from "@oak/oak/context";
import { app_dist } from "../index.ts";
import { send } from "@oak/oak/send";

const targetProxyUrl = "http://localhost:3001";

async function proxyMiddleware(ctx: Context) {
  const url = new URL(ctx.request.url);
  const targetUrl = `${targetProxyUrl}${url.pathname}${url.search}`;

  const requestHeaders = new Headers();
  for (const [key, value] of ctx.request.headers) {
    requestHeaders.set(key, value);
  }

  // change origin header
  requestHeaders.set("Origin", targetProxyUrl);

  const response = await fetch(targetUrl, {
    method: ctx.request.method,
    headers: requestHeaders,
    body: ctx.request.hasBody ? await ctx.request.body.text() : undefined,
  });

  response.headers.forEach((value, key) => {
    // Skip certain headers that can cause issues in proxy
    if (
      ["connection", "keep-alive", "transfer-encoding"].includes(
        key.toLowerCase(),
      )
    ) {
      return;
    }

    ctx.response.headers.set(key, value);
  });

  ctx.response.status = response.status;
  ctx.response.body = response.body;
}

async function staticMiddleware(ctx: Context) {
  const path = ctx.request.url.pathname;
  try {
    await send(ctx, path, {
      root: app_dist,
      index: "index.html",
    });
  } catch {
    // Fallback to index.html for SPA routes
    await send(ctx, "/index.html", {
      root: app_dist,
    });
  }
}

export function getFrontendApp() {
  const router = new Router();

  let middleware: (ctx: Context) => Promise<void>;
  if (Deno.env.get("NODE_ENV") === "development") {
    middleware = proxyMiddleware;
    console.warn(
      `Running in development mode, proxying all traffic to the app to ${targetProxyUrl}`,
    );
  } else {
    middleware = staticMiddleware;
  }

  router.all("/(.*)", middleware);

  return router;
}
