import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { assert } from "console";

export function getFileOverview(
  napiConfig: z.infer<typeof localConfigSchema>,
  fileName: string,
) {
  assert(napiConfig.entrypoint, "Missing entrypoint in napiConfig");
  assert(fileName, "Missing fileName");
  return null;
}
