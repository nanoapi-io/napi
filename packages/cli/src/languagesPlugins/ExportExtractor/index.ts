import PythonExportExtractor from "./python";
import Parser from "tree-sitter";
import {
  ExportExtractor,
  ExportMap,
  UnsupportedExtensionForExportExtractorError,
} from "./types";
import { pythonParser } from "../../helpers/treeSitter/parsers";

export function getExportExtractor(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "py":
      return new PythonExportExtractor(pythonParser);
    default:
      throw new UnsupportedExtensionForExportExtractorError(
        extension || "No extension",
      );
  }
}

export function generateExportMap(files: { path: string; code: string }[]) {
  const exportMap: ExportMap = {};

  files.forEach(({ path, code }) => {
    let exportExtractor: ExportExtractor;

    try {
      exportExtractor = getExportExtractor(path);
    } catch (e) {
      if (e instanceof UnsupportedExtensionForExportExtractorError) {
        console.log(e.message);
        exportMap[path] = {
          filePath: path,
          language: "unknown",
          couldNotProcess: true,
          exportStatements: [],
        };
        return;
      } else {
        throw e;
      }
    }

    let tree: Parser.Tree;

    try {
      tree = exportExtractor.parser.parse(code);
    } catch (e) {
      console.error(`Error parsing file: ${path}`);
      console.error(e);
      exportMap[path] = {
        filePath: path,
        language: exportExtractor.parser.getLanguage().name,
        couldNotProcess: true,
        exportStatements: [],
      };
      return;
    }

    const exportStatements = exportExtractor.run(path, tree.rootNode);

    exportMap[path] = {
      filePath: path,
      language: exportExtractor.parser.getLanguage().name,
      couldNotProcess: false,
      exportStatements,
    };
  });

  return exportMap;
}
