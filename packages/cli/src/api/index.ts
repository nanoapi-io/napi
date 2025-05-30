import { Router } from "@oak/oak";
import type { z } from "zod";
import type { localConfigSchema } from "../config/localConfig.ts";
import {
  getFilesFromDirectory,
  writeFilesToDirectory,
} from "../helpers/fileSystem/index.ts";
import { getExtensionsForLanguage } from "../helpers/fileSystem/index.ts";
import { generateAuditManifest } from "../manifest/auditManifest/index.ts";
import { extractSymbols } from "../symbolExtractor/index.ts";
import { join } from "@std/path";
import { extractSymbolPayloadSchema } from "./types.ts";
import type { DependencyManifest } from "@napi/shared";

export function getApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
  dependencyManifest: DependencyManifest,
) {
  const fileExtensions = getExtensionsForLanguage(napiConfig.language);

  const files = getFilesFromDirectory(workDir, {
    includes: napiConfig.project.include,
    excludes: napiConfig.project.exclude,
    extensions: fileExtensions,
    logMessages: true,
  });

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

  api.post("/api/extractSymbol", async (ctx) => {
    const body = await ctx.request.body.json();

    const parsedPayload = extractSymbolPayloadSchema.safeParse(body);

    if (!parsedPayload.success) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: parsedPayload.error,
      };
      return;
    }

    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();
    for (const { filePath, symbols } of parsedPayload.data) {
      symbolsToExtract.set(filePath, { filePath, symbols: new Set(symbols) });
    }

    const extractedFileMap = extractSymbols(
      files,
      dependencyManifest,
      symbolsToExtract,
      napiConfig,
    );

    const unixTimestamp = Date.now();
    const outputDir = join(
      workDir,
      napiConfig.outDir,
      `extracted-${unixTimestamp}`,
    );
    writeFilesToDirectory(extractedFileMap, outputDir);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
    };
  });

  return api;
}
