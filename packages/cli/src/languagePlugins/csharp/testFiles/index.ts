import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

export const csharpFilesFolder = path.join(__dirname, "csharpFiles");

const csharpFilesMap = new Map<
  string,
  { path: string; rootNode: Parser.SyntaxNode }
>();

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

export function getCSharpFilesMap() {
  findCSharpFiles(csharpFilesFolder);
  return csharpFilesMap;
}
