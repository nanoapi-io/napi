import JavascriptPlugin from "./javascript";
import { LanguagePlugin } from "./types";
import TypescriptPlugin from "./typescript";

export function getLanguagePluginFromFilePath(
  filePath: string,
): LanguagePlugin {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return new JavascriptPlugin();
    case "ts":
      return new TypescriptPlugin();
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
