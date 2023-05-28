import path from "path";
import { readFile } from "fs/promises";

// Read the package.json file and return the entrypoint file path
export const getEntrypointPath = async (inputPath) => {
  const packageJsonPath = path.join(inputPath, "package.json");
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf-8")
  );
  const entrypointPath = path.join(inputPath, packageJson.main);
  return entrypointPath;
}
