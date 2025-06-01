import { Router } from "@oak/oak";
import type { z } from "zod";
import type { localConfigSchema } from "../config/localConfig.ts";
import { generateAuditManifest } from "../manifest/auditManifest/index.ts";
import type { DependencyManifest } from "@napi/shared";

export function getApi(
  napiConfig: z.infer<typeof localConfigSchema>,
  dependencyManifest: DependencyManifest,
) {
  const auditManifest = generateAuditManifest(dependencyManifest, napiConfig);

  const api = new Router();

  api.get("/api/config", (ctx) => {
    ctx.response.body = napiConfig;
  });

  api.get("/api/dependency-manifest", (ctx) => {
    ctx.response.body = dependencyManifest;
  });

  api.get("/api/audit-manifest", (ctx) => {
    ctx.response.body = auditManifest;
  });

  return api;
}
