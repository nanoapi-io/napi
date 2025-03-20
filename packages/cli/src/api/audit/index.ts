import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { Audit } from "../../audit/audit";
import { generateAuditResponse } from "./service";

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
      const audit = new Audit(workDir, napiConfig);
      res.status(200).json(audit.auditMap);

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

  auditApi.get("/audit", (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_PROJECT, {
      message: "API request audit project started",
    });

    try {
      const response = generateAuditResponse(workDir, napiConfig);
      res.status(200).json(response);

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
