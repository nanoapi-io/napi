import { join, resolve } from "@std/path";
import { initCli } from "./cli/index.ts";

initCli();

const entryPointDirname: string = resolve(
  import.meta.dirname as string,
);
export const app_dist: string = join(
  entryPointDirname,
  "..",
  "..",
  "app",
  "dist",
);
