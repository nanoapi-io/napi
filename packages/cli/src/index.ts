import path from "node:path";
import { initCli } from "./cli/index.ts";
import process from "node:process";

// remove all warning.
// We need this because of some depreciation warning we have with 3rd party libraries
// Only on production so we still have them on devlopment
if (process.env.NODE_ENV !== "development") {
  process.removeAllListeners("warning");
}

initCli();

export const entryPointDirname = path.resolve(import.meta.dirname as string);
export const app_dist = path.join(entryPointDirname, "..", "..", "app", "dist");
