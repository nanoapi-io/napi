import { json, Router } from "express";
import { z } from "zod";
import { napiConfigSchema } from "../config";
import { scanSchema, splitSchema, syncSchema } from "./helpers/validation";
import { scan } from "./scan";
import { split } from "./split";
import { sync } from "./sync";
import { TelemetryEvents, trackEvent } from "../telemetry";

export function getApi(napiConfig: z.infer<typeof napiConfigSchema>) {
  const api = Router();

  api.use(json());

  api.get("/api/config", (_, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_CONGIG, {
      message: "API request config started",
    });

    if (!napiConfig) {
      res.status(400).json({
        error: "Missing .napirc file in project. Run `napi init` first",
      });
      trackEvent(TelemetryEvents.API_REQUEST_CONGIG, {
        message: "API request config failed, missing .napirc file",
        duration: Date.now(),
      });
      return;
    }

    res.status(200).json(napiConfig);

    trackEvent(TelemetryEvents.API_REQUEST_CONGIG, {
      message: "API request config success",
      duration: Date.now() - startTime,
    });
  });

  api.post("/api/scan", (req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_SCAN, {
      message: "API request scan started",
    });

    const result = scanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      trackEvent(TelemetryEvents.API_REQUEST_SCAN, {
        message: "API request scan failed",
        duration: Date.now() - startTime,
      });
      return;
    }

    try {
      const scanResponse = scan(result.data);
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

  api.post("/api/sync", (req, res) => {
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
      sync(result.data);
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

  api.post("/api/split", async (req, res) => {
    const startTime = Date.now();
    trackEvent(TelemetryEvents.API_REQUEST_SPLIT, {
      message: "API request split started",
    });

    const result = splitSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      trackEvent(TelemetryEvents.API_REQUEST_SPLIT, {
        message: "API request split failed",
        duration: Date.now() - startTime,
      });
      return;
    }

    try {
      const splitResult = await split(result.data);
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

  return api;
}
