import { Router } from "express";

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
  const body: {
    entrypointPath: string;
    targetDir?: string;
  } = req.body;

  res.status(200).json([]);
});

api.post("/api/group", (req, res) => {
  const body: {
    entrypointPath: string;
    targetDir?: string;
    groups: { name: string; endpoints: { method: string; path: string }[] }[];
  } = req.body;

  res.status(200);
});

api.post("/api/split", (req, res) => {
  const body: {
    entrypointPath: string;
    targetDir?: string;
  } = req.body;
  res.status(200).json([]);
});

export default api;
