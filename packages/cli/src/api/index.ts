import { json, Router } from "express";
import { z } from "zod";
import { napiConfigSchema } from "../config";
import { scanSchema, splitSchema, syncSchema } from "./helpers/validation";
import { scan } from "./scan";
import { split } from "./split";
import { sync } from "./sync";

export function getApi(napiConfig: z.infer<typeof napiConfigSchema>) {
  const api = Router();

  api.use(json());

  api.get("/api/config", (_, res) => {
    if (!napiConfig) {
      res.status(400).json({
        error: "Missing .napirc file in project. Run `napi init` first",
      });
      return;
    }

    res.status(200).json(napiConfig);
  });

  api.post("/api/scan", (req, res) => {
    const result = scanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      return;
    }
    const scanResponse = scan(result.data);
    res.status(200).json(scanResponse);
  });

  api.post("/api/sync", (req, res) => {
    const result = syncSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      return;
    }
    sync(result.data);
    res.status(200).json({ success: true });
  });

  api.post("/api/split", async (req, res) => {
    const result = splitSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(result.error.issues);
      return;
    }
    const splitResult = await split(result.data);
    res.status(200).json(splitResult);
  });

  return api;
}
