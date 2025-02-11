import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import { scan } from "./scan";
import { syncSchema, sync } from "./sync";
import { split } from "./split";
import z from "zod";
import { localConfigSchema } from "../../config/localConfig";

export function getSplitApi(
  _workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const splitApi = Router();

  splitApi.post("/scan", (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_SCAN, {
      message: "API request scan started",
    });

    try {
      const scanResponse = scan(napiConfig);
      res.status(200).json(scanResponse);

      trackEvent(TelemetryEvents.API_REQUEST_SCAN, {
        message: "API request scan success",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      trackEvent(TelemetryEvents.API_REQUEST_SCAN, {
        message: "API request scan failed",
        duration: Date.now() - startTime,
        error: error,
      });
      throw error;
    }
  });

  splitApi.post("/sync", (req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_SYNC, {
      message: "API request sync started",
    });

    const result = syncSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      trackEvent(TelemetryEvents.API_REQUEST_SYNC, {
        message: "API request sync failed",
        duration: Date.now() - startTime,
      });
      return;
    }

    try {
      sync(napiConfig, result.data);
      res.status(200).json({ success: true });
      trackEvent(TelemetryEvents.API_REQUEST_SYNC, {
        message: "API request sync success",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      trackEvent(TelemetryEvents.API_REQUEST_SYNC, {
        message: "API request sync failed",
        duration: Date.now() - startTime,
        error: error,
      });
      throw error;
    }
  });

  splitApi.post("/", async (_req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_SPLIT, {
      message: "API request split started",
    });

    try {
      const splitResult = await split(napiConfig);
      res.status(200).json(splitResult);
      trackEvent(TelemetryEvents.API_REQUEST_SPLIT, {
        message: "API request split success",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      trackEvent(TelemetryEvents.API_REQUEST_SPLIT, {
        message: "API request split failed",
        duration: Date.now() - startTime,
        error: error,
      });
      throw error;
    }
  });

  return splitApi;
}
