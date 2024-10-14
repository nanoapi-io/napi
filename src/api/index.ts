import { Router } from "express";
import path from "path";

const api = Router();

// Annotate an api
api.post("/annotate", (req, res) => {
  console.log("Annotating");
  res.send("Annotating");
});

// TODO return the list of API endpoints from an entrypoint
// [
//   {
//     "method": "GET",
//     "path": "/scan",
//     "dependencies": [
//       "/index.ts",
//       "router.ts",
//       "/utils.ts",
//     ],
//   },
// ]
api.post("/scan", (req, res) => {
  const body: {
    entrypointPath: string;
    targetDir?: string;
  } = req.body;

  res.json([
    {
      method: "GET",
      path: "/scan",
      dependencies: ["/index.ts", "router.ts", "/utils.ts"],
    },
    {
      method: "POST",
      path: "/scan",
      dependencies: ["/index.ts", "router.ts", "/utils.ts"],
    },
  ]);
});

// TODO split the codebase into multiple ones according to annotation
api.post("/split", (req, res) => {
  console.log("Splitting");
  res.send("Splitting");
});

export default api;
