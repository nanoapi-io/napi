import { z } from "zod";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { scanSchema } from "./helpers/validation";

export function scan(payload: z.infer<typeof scanSchema>) {
  const dependencyTreeManager = new DependencyTreeManager(
    payload.entrypointPath,
  );
  const endpoints = dependencyTreeManager.getEndponts();

  return { endpoints };
}
