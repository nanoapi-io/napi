// @ts-check

import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  eslintPluginPrettierRecommended,
  {
    ignores: [
      "**/node_modules/**/*",
      "examples/**",
      "packages/app/dist",
      "packages/cli/dist",
      "packages/cli/src/**/worker.js",
    ],
  },
);
