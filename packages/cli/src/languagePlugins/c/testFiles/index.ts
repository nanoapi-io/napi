import * as fs from "node:fs";
import { extname, join } from "@std/path";
import type Parser from "tree-sitter";
import { cLanguage, cParser } from "../../../helpers/treeSitter/parsers.ts";

if (!import.meta.dirname) {
  throw new Error("import.meta.dirname is not defined");
}
export const cFilesFolder = join(import.meta.dirname, "cFiles");
const cFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();

/**
 * Recursively finds all C files in the given directory and its subdirectories.
 * @param dir - The directory to search in.
 */
function findCFiles(dir: string) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        !fullPath.includes(".extracted/") &&
        !fullPath.includes("bin/") &&
        !fullPath.includes("obj/")
      ) {
        findCFiles(fullPath);
      }
    } else if (
      extname(fullPath) === ".c" ||
      extname(fullPath) === ".h"
    ) {
      const content = fs.readFileSync(fullPath, "utf8");
      const tree = cParser.parse(content);
      cFilesMap.set(fullPath, { path: fullPath, rootNode: tree.rootNode });
    }
  });
}

export function getCFilesMap(): Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
> {
  findCFiles(cFilesFolder);
  return cFilesMap;
}

export function getCFilesContentMap(): Map<
  string,
  { path: string; content: string }
> {
  findCFiles(cFilesFolder);
  const contentMap = new Map<string, { path: string; content: string }>();
  for (const [filePath, file] of cFilesMap) {
    contentMap.set(filePath, {
      path: file.path,
      content: file.rootNode.text,
    });
  }
  return contentMap;
}

export const dummyLocalConfig = {
  language: cLanguage,
  project: {
    include: [],
    exclude: [],
  },
  outDir: "./dist",
  c: {
    includedirs: [],
  },
};
