import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { generateAuditResponse } from "./service";
import path from "path";
import fs from "fs";

export function getAuditApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const auditApi = Router();

  auditApi.get("/", (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_PROJECT, {
      message: "API request audit project started",
    });

    try {
      const response = generateAuditResponse(workDir, napiConfig);
      res.status(200).json(response);
      if (napiConfig.audit.manifestoJsonOutputPath) {
        const outputPath = path.resolve(
          workDir,
          napiConfig.audit.manifestoJsonOutputPath,
          "auditResponse.json",
        );
        console.log(outputPath);
        fs.writeFileSync(outputPath, JSON.stringify(response, null, 2));
      }

      trackEvent(TelemetryEvents.API_REQUEST_AUDIT_PROJECT, {
        message: "API request audit project success",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      trackEvent(TelemetryEvents.API_REQUEST_AUDIT_PROJECT, {
        message: "API request audit project failed",
        duration: Date.now() - startTime,
        error: error,
      });
      throw error;
    }
  });

  return auditApi;
}
