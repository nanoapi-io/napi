#!/usr/bin/env node
import { initCli } from "./cli/index.js";

// remove all warning.
// We need this because of some depreciation warning we have with 3rd party libraries
// Only on production so we still have them on devlopment
if (process.env.NODE_ENV !== "development") {
  process.removeAllListeners("warning");
}

initCli();

export const entryPointDirname = import.meta.dirname;
