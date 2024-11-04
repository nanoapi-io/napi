import { z } from "zod";
import {
  getDependencyTree,
  getEndpontsFromTree,
} from "../helper/dependencyTree";
import { scanSchema } from "./helpers/validation";

export function scan(payload: z.infer<typeof scanSchema>) {
  const tree = getDependencyTree(payload.entrypointPath);

  const endpoints = getEndpontsFromTree(tree);

  return { endpoints };
}
