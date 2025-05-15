import { Router, static as expressStatic } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { app_dist } from "../index.ts";
import process from "node:process";

export function getFrontentApp() {
  const app = Router();

  if (process.env.NODE_ENV === "development") {
    const targetServiceUrl = "http://localhost:3001";
    console.warn(
      `Running in development mode, proxying all traffic to the app to ${targetServiceUrl}`,
    );
    app.use(createProxyMiddleware({
      target: targetServiceUrl,
      changeOrigin: true,
    }));
  } else {
    // Serve static files from the app_dist directory
    app.use(expressStatic(app_dist));

    // Handle SPA routing - serve index.html for all routes
    app.get("/*splat", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api/")) {
        return next();
      }
      // Serve the index.html for client-side routing
      res.sendFile("index.html", { root: app_dist });
    });
  }

  return app;
}
