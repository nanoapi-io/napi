import fs from "fs";
import path from "path";
import prompts from "prompts";
import z from "zod";
import {
  createConfig,
  getConfigFromWorkDir,
  napiConfigSchema,
} from "../config";

async function promptForEntryPointPath(currentPath: string) {
  // Read the current directory's contents
  const items = fs.readdirSync(currentPath).map((item) => {
    const fullPath = path.join(currentPath, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    return { title: item + (isDir ? "/" : ""), value: fullPath, isDir };
  });

  // Add an option to go up a directory
  if (currentPath !== path.parse(currentPath).root) {
    items.unshift({
      title: "../",
      value: path.join(currentPath, ".."),
      isDir: true,
    });
  }

  // Ask user to select a file or directory
  const response = await prompts({
    type: "select",
    name: "selectedPath",
    message: `Select the entrypoint file of your application\nNavigate through: ${currentPath}`,
    choices: items,
  });

  // If the user selected a directory, navigate into it
  if (
    response.selectedPath &&
    fs.statSync(response.selectedPath).isDirectory()
  ) {
    return promptForEntryPointPath(response.selectedPath);
  }

  // Return the file path if a file is selected
  return response.selectedPath;
}

export default async function initCommandHandler(workdir: string) {
  if (getConfigFromWorkDir(workdir)) {
    const response = await prompts({
      type: "confirm",
      name: "confirm",
      message: `A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
      initial: false,
    });
    if (!response.confirm) {
      return;
    }
  }

  const absoluteFilePath = await promptForEntryPointPath(workdir);
  const relativeFilePath = path.relative(workdir, absoluteFilePath);

  const napiConfig: z.infer<typeof napiConfigSchema> = {
    entrypoint: relativeFilePath,
    out: "napi_dist",
  };

  createConfig(napiConfig, workdir);

  console.log("Successfully created .napirc");
}
