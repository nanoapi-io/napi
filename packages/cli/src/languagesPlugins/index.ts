import JavascriptPlugin from "./javascript";
import PythonPlugin from "./python";
import { LanguagePlugin } from "./types";
import TypescriptPlugin from "./typescript";

export function getLanguagePlugin(
  entryPointPath: string,
  filePath: string,
): LanguagePlugin {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return new JavascriptPlugin(entryPointPath);
    case "ts":
      return new TypescriptPlugin(entryPointPath);
    case "py":
      return new PythonPlugin(entryPointPath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
