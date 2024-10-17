import { json, Router } from "express";
import { scan } from "./scan";
import { split } from "./split";
import { sync } from "./sync";
import { scanSchema, splitSchema, syncSchema } from "./helpers/validation";

const api = Router();

api.use(json());

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

api.post("/api/split", (req, res) => {
  const result = splitSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(result.error.issues);
    return;
  }
  const splitResult = split(result.data);
  res.status(200).json(splitResult);
});

export default api;
