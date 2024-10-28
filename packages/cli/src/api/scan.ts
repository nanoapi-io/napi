import { z } from "zod";
import { getDependencyTree } from "../helper/dependencies";
import { ScanCodebaseResponsePayload } from "../helper/payloads";
import { getEndpontsFromTree } from "../helper/tree";
import { scanSchema } from "./helpers/validation";

export function scan(
  payload: z.infer<typeof scanSchema>,
): ScanCodebaseResponsePayload {
  const tree = getDependencyTree(payload.entrypointPath);

  const endpoints = getEndpontsFromTree(tree);

  return { endpoints };
}
