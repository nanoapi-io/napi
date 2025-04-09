import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export const csharpFilesFolder = path.join(__dirname, "csharpFiles");

const csharpFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();

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
      findCSharpFiles(fullPath);
    } else if (path.extname(fullPath) === ".cs") {
      const content = fs.readFileSync(fullPath, "utf8");
      const tree = csharpParser.parse(content);
      csharpFilesMap.set(fullPath, { path: fullPath, rootNode: tree.rootNode });
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
