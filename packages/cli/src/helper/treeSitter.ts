import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";
import Python from "tree-sitter-python";

export function getParserLanguageFromFile(filePath: string) {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return Javascript;
    case "ts":
      return Typescript.typescript;
    case "py":
      return Python;
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
