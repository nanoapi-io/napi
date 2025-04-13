import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { generateAuditResponse } from "./service";
import { DependencyManifest } from "../../manifest/dependencyManifest";
import { AuditManifest } from "../../manifest/auditManifest";
import path from "path";
import fs from "fs";

export function getAuditApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const auditApi = Router();

  let auditResponse: {
    auditManifest: AuditManifest;
    dependencyManifest: DependencyManifest;
  };
  try {
    auditResponse = generateAuditResponse(workDir, napiConfig);
    if (napiConfig.audit.manifestoJsonOutputPath) {
      const outputPath = path.resolve(
        workDir,
        napiConfig.audit.manifestoJsonOutputPath,
        "auditResponse.json",
      );
      fs.writeFileSync(outputPath, JSON.stringify(auditResponse, null, 2));
    }
  } catch (error) {
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
      message: "Failed to generate audit response",
      error: error,
    });
    throw error;
  }

  // Why???? We can just return the auditResponse directly or the express function
  auditApi.get("/", (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
      message: "API request audit project started",
    });

    res.status(200).json(auditResponse);

    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
      message: "API request audit project success",
      duration: Date.now() - startTime,
    });
  });

  return auditApi;
}
