import { json, Router } from "express";
import { z } from "zod";
import { localConfigSchema } from "../config/localConfig";
import { getSplitApi } from "./split";
import { getAuditApi } from "./audit";

declare module "express-serve-static-core" {
  interface Request {
    napiConfig: z.infer<typeof localConfigSchema>;
  }
}

export function getApi(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const api = Router();

  api.use(json());

  api.use("/api/split", getSplitApi(workDir, napiConfig));

  api.use("/api/audit", getAuditApi(workDir, napiConfig));

  return api;
}
