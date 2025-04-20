import { json, Router } from "express";
import { z } from "zod";
import { localConfigSchema } from "../config/localConfig";
import {
  getFilesFromDirectory,
  writeFilesToDirectory,
} from "../helpers/fileSystem";
import { getExtensionsForLanguage } from "../helpers/fileSystem";
import { generateDependencyManifest } from "../manifest/dependencyManifest";
import { generateAuditManifest } from "../manifest/auditManifest";
import { extractSymbols } from "../symbolExtractor";
import { join } from "path";
import { extractSymbolPayloadSchema } from "./types";

export function getApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const fileExtensions = getExtensionsForLanguage(napiConfig.language);

  const files = getFilesFromDirectory(workDir, {
    includes: napiConfig.project.include,
    excludes: napiConfig.project.exclude,
    extensions: fileExtensions,
    logMessages: true,
  });

  const dependencyManifest = generateDependencyManifest(files, napiConfig);
  const auditManifest = generateAuditManifest(dependencyManifest, napiConfig);

  const api = Router();

  api.use(json());

  api.get("/api/config", (_, res) => {
    res.json(napiConfig);
  });

  api.get("/api/dependency-manifest", (_, res) => {
    res.json(dependencyManifest);
  });

  api.get("/api/audit-manifest", (_, res) => {
    res.json(auditManifest);
  });

  api.post("/api/extractSymbol", (req, res) => {
    const parsedPayload = extractSymbolPayloadSchema.safeParse(req.body);

    if (!parsedPayload.success) {
      res.status(400).json({
        success: false,
        error: parsedPayload.error,
      });
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

    const outputDir = join(workDir, "napi-output");
    writeFilesToDirectory(extractedFileMap, outputDir);

    res.status(200).json({
      success: true,
    });
  });

  return api;
}
