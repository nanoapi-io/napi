import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  splitting: false,
  clean: true,
  dts: false,
  bundle: true,
  noExternal: ["@nanoapi.io/shared"], // force bundling shared
  outDir: "dist",
});
