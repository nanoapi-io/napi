import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { generateAuditResponse } from "./service";
import { DependencyManifesto } from "../../manifestos/dependencyManifesto";
import { AuditManifesto } from "../../manifestos/auditManifesto";

let cachedAuditResponse:
  | {
      auditManifesto: AuditManifesto;
      dependencyManifesto: DependencyManifesto;
    }
  | undefined = undefined;

export function getAuditApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const auditApi = Router();

  auditApi.get("/", (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
      message: "API request audit project started",
    });

    try {
      if (cachedAuditResponse) {
        res.status(200).json(cachedAuditResponse);
      } else {
        const response = generateAuditResponse(workDir, napiConfig);
        cachedAuditResponse = response;
        res.status(200).json(response);
      }

      trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
        message: "API request audit project success",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      trackEvent(TelemetryEvents.API_REQUEST_AUDIT_VIEW, {
        message: "API request audit project failed",
        duration: Date.now() - startTime,
        error: error,
      });
      throw error;
    }
  });

  return auditApi;
}
