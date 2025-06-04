import * as fs from "node:fs";
import { extname, join } from "@std/path";
import type Parser from "tree-sitter";
import {
  javaLanguage,
  javaParser,
} from "../../../helpers/treeSitter/parsers.ts";

if (!import.meta.dirname) {
  throw new Error("import.meta.dirname is not defined");
}
export const javaFilesFolder = join(import.meta.dirname, "napi-tests");
const javaFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();

/**
 * Recursively finds all C files in the given directory and its subdirectories.
 * @param dir - The directory to search in.
 */
function findJavaFiles(dir: string) {
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
        findJavaFiles(fullPath);
      }
    } else if (
      extname(fullPath) === ".java"
    ) {
      const content = fs.readFileSync(fullPath, "utf8");
      const tree = javaParser.parse(content);
      javaFilesMap.set(fullPath, { path: fullPath, rootNode: tree.rootNode });
    }
  });
}

export function getJavaFilesMap(): Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
> {
  findJavaFiles(javaFilesFolder);
  return javaFilesMap;
}

export function getJavaFilesContentMap(): Map<
  string,
  { path: string; content: string }
> {
  findJavaFiles(javaFilesFolder);
  const contentMap = new Map<string, { path: string; content: string }>();
  for (const [filePath, file] of javaFilesMap) {
    contentMap.set(filePath, {
      path: file.path,
      content: file.rootNode.text,
    });
  }
  return contentMap;
}

export const dummyLocalConfig = {
  language: javaLanguage,
  project: {
    include: [],
    exclude: [],
  },
  outDir: "./dist",
};
