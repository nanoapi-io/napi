import { VisualizerFile } from "./types";
import path from "path";
import fs from "fs";
import { getLanguagePlugin } from "../languagesPlugins";

export class ProjectOverview {
  files: VisualizerFile[] = [];

  constructor(dir: string) {
    this.#getFiles(dir);
  }

  #getFiles(dir: string) {
    if (!fs.existsSync(dir)) {
      throw new Error("Directory does not exist");
    }
    if (!fs.lstatSync(dir).isDirectory()) {
      throw new Error("Path is not a directory");
    }

    const filePaths = fs.readdirSync(dir);

    filePaths.forEach((filePath) => {
      const fullPath = path.join(dir, filePath);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        this.#getFiles(fullPath);
      }

      if (stat.isFile()) {
        const sourceCode = fs.readFileSync(fullPath, "utf8");

        const plugin = getLanguagePlugin(fullPath, fullPath);

        const tree = plugin.parser.parse(sourceCode);

        const depImports = plugin.getImports(fullPath, tree.rootNode);

        const importSources = depImports
          .filter((depImport) => !depImport.isExternal)
          .map((depImport) => depImport.source);

        const file: VisualizerFile = {
          path: fullPath,
          sourceCode,
          importSources,
        };
        this.files.push(file);
      }
    });
  }
}
