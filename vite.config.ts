import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // TODO this is a workarround, should remove vitest and use Deno.test() instead
      "@napi/shared": resolve("./packages/shared/src/index.ts"),
    },
  },
});