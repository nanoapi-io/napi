import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { generateAuditResponse } from "./service";
import { DependencyManifesto } from "../../manifestos/dependencyManifesto";
import { AuditManifesto } from "../../manifestos/auditManifesto";

export function getAuditApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const auditApi = Router();

  let auditResponse: {
    auditManifesto: AuditManifesto;
    dependencyManifesto: DependencyManifesto;
  };
  try {
    auditResponse = generateAuditResponse(workDir, napiConfig);
  } catch (error) {
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
      message: "Failed to generate audit response",
      error: error,
    });
    throw error;
  }

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
