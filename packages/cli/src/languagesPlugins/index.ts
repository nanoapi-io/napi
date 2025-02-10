import JavascriptPlugin from "./javascript";
import PythonPlugin from "./python";
import { LanguagePlugin } from "./types";
import UnknownPlugin from "./unknown";

export function getLanguagePlugin(
  entryPointPath: string,
  filePath: string,
): LanguagePlugin {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return new JavascriptPlugin(entryPointPath, false);
    case "ts":
      return new JavascriptPlugin(entryPointPath, true);
    case "py":
      return new PythonPlugin(entryPointPath);
    default:
      return new UnknownPlugin(entryPointPath);
  }
}
