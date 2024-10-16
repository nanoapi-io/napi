import { Router } from "express";
import { z } from "zod";

const api = Router();

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

  res.status(200).json([]);
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
  });

  const result = splitSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(result.error.issues);
    return;
  }
});

export default api;
