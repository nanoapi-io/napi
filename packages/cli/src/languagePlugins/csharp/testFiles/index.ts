import fs from "node:fs";
import path from "node:path";
import type Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers.ts";

export const csharpFilesFolder = path.join(__dirname, "csharpFiles");

const csharpFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();
const csprojFiles = new Map<string, { path: string; content: string }>();

/**
 * Recursively finds all C# files in the given directory and its subdirectories.
 * @param dir - The directory to search in.
 */
function findCSharpFiles(dir: string) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        !fullPath.includes(".extracted") &&
        !fullPath.includes("bin") &&
        !fullPath.includes("obj")
      ) {
        findCSharpFiles(fullPath);
      }
    } else if (path.extname(fullPath) === ".cs") {
      const content = fs.readFileSync(fullPath, "utf8");
      const tree = csharpParser.parse(content);
      csharpFilesMap.set(fullPath, { path: fullPath, rootNode: tree.rootNode });
    }
  });
}

/**
 * Recursively finds all .csproj files in the given directory and its subdirectories.
 * @param dir - The directory to search in.
 */
function findCsprojFiles(dir: string): void {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        !fullPath.includes(".extracted") &&
        !fullPath.includes("bin") &&
        !fullPath.includes("obj")
      ) {
        findCsprojFiles(fullPath);
      }
    } else if (path.extname(fullPath) === ".csproj") {
      const content = fs.readFileSync(fullPath, "utf8");
      csprojFiles.set(fullPath, { path: fullPath, content: content });
    }
  });
}

/**
 * Retrieves the map of C# files and their corresponding syntax trees.
 * @returns A map where the keys are file paths and the values are objects containing the file path and its syntax tree.
 */
export function getCSharpFilesMap() {
  findCSharpFiles(csharpFilesFolder);
  return csharpFilesMap;
}

/**
 * Retrieves the map of .csproj files and their content.
 * @returns A map where the keys are file paths and the values are the content of the .csproj files.
 */
export function getCsprojFilesMap() {
  findCsprojFiles(csharpFilesFolder);
  return csprojFiles;
}
