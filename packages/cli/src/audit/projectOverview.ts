import { AuditFile } from "./types";
import path from "path";
import fs, { globSync } from "fs";
import { getLanguagePlugin } from "../languagesPlugins";
import { localConfigSchema } from "../config/localConfig";
import z from "zod";
import UnknownPlugin from "../languagesPlugins/unknown";

export class ProjectOverview {
  files: AuditFile[] = [];

  constructor(dir: string, config: z.infer<typeof localConfigSchema>) {
    this.#init(dir, config);
  }

  #init(dir: string, config: z.infer<typeof localConfigSchema>) {
    const files = this.#getFiles(dir, config);

    files.forEach((file) => {
      const plugin = getLanguagePlugin(dir, file.path);

      if (plugin.constructor === UnknownPlugin) {
        console.warn(`Unknown file type, ignoring: ${file.path}`);
        return;
      }

      const tree = plugin.parser.parse(file.sourceCode);

      const depImports = plugin.getImports(file.path, tree.rootNode);

      const importSources = depImports
        .filter((depImport) => !depImport.isExternal)
        .map((depImport) => depImport.source);

      this.files.push({
        path: file.path,
        sourceCode: file.sourceCode,
        importSources,
        analysis: {
          tooManyChar: {
            value: file.sourceCode.length,
            target: config.audit?.targetMaxCharInFile || 0,
            result: this.#getTooManyCharResult(
              file.sourceCode,
              config.audit?.targetMaxCharInFile || 0,
            ),
          },
          tooManyLines: {
            value: file.sourceCode.split("\n").length,
            target: config.audit?.targetMaxLineInFile || 0,
            result: this.#getTooManyLinesResult(
              file.sourceCode,
              config.audit?.targetMaxLineInFile || 0,
            ),
          },
          tooManyDependencies: {
            value: importSources.length,
            target: config.audit?.targetMaxDepPerFile || 0,
            result: this.#getTooManyDependenciesResult(
              importSources,
              config.audit?.targetMaxDepPerFile || 0,
            ),
          },
          // The following properties are checked later
          isUnused: false,
          circularDependencySources: [],
        },
      });
    });

    this.#checkForUnusedFiles();
    this.#checkForCircularDependencies();
  }

  #getFiles(dir: string, config: z.infer<typeof localConfigSchema>) {
    const patterns = config.audit?.patterns
      ? config.audit?.patterns.map((pattern) => path.join(dir, pattern))
      : [`${dir}/**`];

    let filePaths = globSync(patterns);
    filePaths = filePaths.filter((filePath) => fs.lstatSync(filePath).isFile());

    const files: { path: string; sourceCode: string }[] = [];

    filePaths.forEach((filePath) => {
      const sourceCode = fs.readFileSync(filePath, "utf8");
      files.push({ path: filePath, sourceCode });
    });

    return files;
  }

  #getTooManyCharResult(sourceCode: string, target: number) {
    const charLength = sourceCode.length;
    if (target === 0) return "ok";
    if (charLength > target) return "error";
    if (charLength > target * 0.9) return "warning";
    return "ok";
  }

  #getTooManyLinesResult(sourceCode: string, target: number) {
    const lineCount = sourceCode.split("\n").length;
    if (target === 0) return "ok";
    if (lineCount > target) return "error";
    if (lineCount > target * 0.9) return "warning";
    return "ok";
  }

  #getTooManyDependenciesResult(importSources: string[], target: number) {
    if (target === 0) return "ok";
    if (importSources.length > target) return "error";
    if (importSources.length > target * 0.9) return "warning";
    return "ok";
  }

  #checkForUnusedFiles() {
    this.files = this.files.map((file) => {
      const isUnused = !this.files.some((f) =>
        f.importSources.includes(file.path),
      );
      return { ...file, isUnused };
    });
  }

  #checkForCircularDependencies() {
    this.files = this.files.map((file) => {
      // find all files that this file imports
      const targetFiles = this.files.filter((f) =>
        file.importSources.includes(f.path),
      );

      const circularDependencySources: string[] = [];

      // Check if any of the target files import this file
      targetFiles.forEach((targetFile) => {
        if (targetFile.importSources.includes(file.path)) {
          circularDependencySources.push(targetFile.path);
        }
      });

      return { ...file, circularDependencySources };
    });
  }
}
