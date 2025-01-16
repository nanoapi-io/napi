import { z } from "zod";
import DependencyTreeManager from "../../dependencyManager/dependencyManager";
import { localConfigSchema } from "../../config/localConfig";

export function scan(napiConfig: z.infer<typeof localConfigSchema>) {
  const dependencyTreeManager = new DependencyTreeManager(
    napiConfig.entrypoint,
  );
  const endpoints = dependencyTreeManager.getEndponts();

  return { endpoints };
}
