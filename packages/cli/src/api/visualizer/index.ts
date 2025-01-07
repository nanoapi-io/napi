import { Router } from "express";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import z from "zod";
import { getFileOverview } from "./file";
import { getProjectOverview } from "./project";

const visualizerApi = Router();

visualizerApi.get("/project", (req, res) => {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_PROJECT, {
    message: "API request visualizer project started",
  });

  try {
    const projectOverviewResponse = getProjectOverview(req.napiConfig);
    res.status(200).json(projectOverviewResponse);

    trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_PROJECT, {
      message: "API request visualizer project success",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_PROJECT, {
      message: "API request visualizer project failed",
      duration: Date.now() - startTime,
      error: error,
    });
    throw error;
  }
});

visualizerApi.get("/file/:file", (req, res) => {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_FILE, {
    message: "API request visualizer file started",
  });

  const schema = z.object({
    file: z.string().nonempty("File name is required"),
  });

  const result = schema.safeParse(req.params);

  if (!result.success) {
    res.status(400).json(result.error.issues);
    trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_FILE, {
      message: "API request visualizer file failed",
      duration: Date.now() - startTime,
    });
    return;
  }

  try {
    const scanResponse = getFileOverview(req.napiConfig, result.data.file);
    res.status(200).json(scanResponse);

    trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_FILE, {
      message: "API request visualizer file success",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent(TelemetryEvents.API_REQUEST_VISUALIZER_FILE, {
      message: "API request visualizer file failed",
      duration: Date.now() - startTime,
      error: error,
    });
    throw error;
  }
});

export { visualizerApi };
