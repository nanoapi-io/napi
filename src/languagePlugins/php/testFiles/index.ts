import * as fs from "node:fs";
import { extname, join } from "@std/path";
import type Parser from "tree-sitter";
import { phpLanguage, phpParser } from "../../../helpers/treeSitter/parsers.ts";

if (!import.meta.dirname) {
  throw new Error("import.meta.dirname is not defined");
}
export const phpFilesFolder = join(
  import.meta.dirname,
  "phpFiles",
);
const phpFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();

/**
 * Recursively finds all C files in the given directory and its subdirectories.
 * @param dir - The directory to search in.
 */
function findPHPFiles(dir: string) {
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
        findPHPFiles(fullPath);
      }
    } else if (
      extname(fullPath) === ".php"
    ) {
      const content = fs.readFileSync(fullPath, "utf8");
      const tree = phpParser.parse(content);
      phpFilesMap.set(fullPath, { path: fullPath, rootNode: tree.rootNode });
    }
  });
}

export function getPHPFilesMap(): Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
> {
  findPHPFiles(phpFilesFolder);
  return phpFilesMap;
}

export function getPHPFilesContentMap(): Map<
  string,
  { path: string; content: string }
> {
  findPHPFiles(phpFilesFolder);
  const contentMap = new Map<string, { path: string; content: string }>();
  for (const [filePath, file] of phpFilesMap) {
    contentMap.set(filePath, {
      path: file.path,
      content: file.rootNode.text,
    });
  }
  return contentMap;
}

export const dummyLocalConfig = {
  language: phpLanguage,
  project: {
    include: [],
    exclude: [],
  },
  outDir: "./dist",
};
