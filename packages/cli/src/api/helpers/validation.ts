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
  outputDir: z.string().optional(),
});

function isValidFilePath(filePath: string) {
  // Try with original path
  if (!fs.existsSync(filePath)) {
    // Try with relative path
    const relativePath = path.relative(process.cwd(), filePath);
    if (!fs.existsSync(relativePath)) {
      return false;
    }
    filePath = relativePath;
  }

  try {
    if (!fs.statSync(filePath).isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  return path.isAbsolute(filePath) || process.platform === "win32";
}
