import JavascriptPlugin from "./javascript";
import PythonPlugin from "./python";
import { LanguagePlugin } from "./types";
import UnknownPlugin from "./unknown";

export function getLanguagePlugin(
  baseDir: string,
  filePath: string,
): LanguagePlugin {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return new JavascriptPlugin(baseDir, false);
    case "ts":
      return new JavascriptPlugin(baseDir, true);
    case "py":
      return new PythonPlugin(baseDir);
    default:
      return new UnknownPlugin(baseDir);
  }
}
