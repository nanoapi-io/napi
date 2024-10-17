import { json, Router } from "express";
import path from "path";
import { z } from "zod";
import { scan } from "./scan";
import { split } from "./split";

const api = Router();

api.use(json());

api.post("/annotate/openai", (req, res) => {
  const body: {
    entrypointPath: string;
    targetDir?: string;
    apiKey: string;
  } = req.body;

  res.status(200).send("Annotating");
});

api.post("/api/scan", (req, res) => {
  const scanSchema = z.object({
    entrypointPath: z.string(),
    targetDir: z.string().optional(),
  });

  const result = scanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(result.error.issues);
    return;
  }

  const scanResult = scan({
    entrypointPath: result.data.entrypointPath,
    targetDir: result.data.targetDir,
  });

  res.status(200).json(scanResult);
});

api.post("/api/sync", (req, res) => {
  const syncSchema = z.object({
    entrypointPath: z.string(),
    targetDir: z.string().optional(),
    endpoints: z.array(
      z.object({
        method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
        path: z.string(),
        group: z.string().optional(),
      })
    ),
  });

  const result = syncSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(result.error.issues);
    return;
  }

  res.status(200);
});

api.post("/api/split", (req, res) => {
  const splitSchema = z.object({
    entrypointPath: z.string(),
    targetDir: z.string().optional(),
    outputDir: z.string().optional(),
  });

  const result = splitSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(result.error.issues);
    return;
  }

  const targetDir = result.data.targetDir
    ? path.resolve(result.data.targetDir)
    : path.dirname(result.data.entrypointPath);

  const outputDir = result.data.outputDir
    ? path.resolve(result.data.outputDir)
    : targetDir;

  const splitResult = split({
    entrypointPath: result.data.entrypointPath,
    targetDir,
    outputDir,
  });

  res.status(200).json(splitResult);
});

export default api;
