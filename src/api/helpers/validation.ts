import fs from "fs";
import path from "path";
import { z } from "zod";

export const scanSchema = z.object({
  entrypointPath: z.string().refine((val) => isValidFilePath(val), {
    message: "Invalid file path",
  }),
});

export const syncSchema = z.object({
  entrypointPath: z.string().refine((val) => isValidFilePath(val), {
    message: "Invalid file path",
  }),
  endpoints: z.array(
    z.object({
      path: z.string(),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
      group: z.string().optional(),
    })
  ),
});

export const splitSchema = z.object({
  entrypointPath: z.string().refine((val) => isValidFilePath(val), {
    message: "Invalid file path",
  }),
  targetDir: z.string().optional(),
  outputDir: z.string().optional(),
});

function isValidFilePath(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    if (!fs.statSync(filePath).isFile()) {
      return false;
    }
  } catch (err) {
    return false;
  }
  return path.isAbsolute(filePath) && !/[<>:"|?*]/.test(filePath);
}
