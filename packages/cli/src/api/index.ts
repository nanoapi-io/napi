import { json, Router } from "express";
import { z } from "zod";
import { localConfigSchema } from "../config/localConfig";
import { splitApi } from "./split";
import { visualizerApi } from "./visualizer";

declare module "express-serve-static-core" {
  interface Request {
    napiConfig: z.infer<typeof localConfigSchema>;
  }
}

export function getApi(napiConfig: z.infer<typeof localConfigSchema>) {
  const api = Router();

  api.use(json());

  api.use((req, _, next) => {
    req.napiConfig = napiConfig;
    next();
  });

  api.use("/api/split", splitApi);

  api.use("/api/visualizer", visualizerApi);

  return api;
}
