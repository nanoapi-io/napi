import fs from "fs";
import path from "path";

export function cleanupOutputDir(outputDir: string) {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
}

export function createOutputDir(outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export function resolveFilePath(importPath: string, currentFile: string) {
  const currentFileExt = path.extname(currentFile);
  const importExt = path.extname(importPath);
  if (importPath.startsWith(".")) {
    if (importExt) {
      // If import path has an extension, resolve directly
      const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    }

    // If import path does not have an extension, try current file's extension first
    const resolvedPathWithCurrentExt = path.resolve(
      path.dirname(currentFile),
      `${importPath}${currentFileExt}`,
    );
    if (fs.existsSync(resolvedPathWithCurrentExt)) {
      return resolvedPathWithCurrentExt;
    }

    // try to resolve with any extension
    const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
    try {
      const resolvedPathWithAnyExt = require.resolve(resolvedPath);
      if (fs.existsSync(resolvedPathWithAnyExt)) {
        return resolvedPathWithAnyExt;
      }
    } catch {
      // cannot resolve the path, return null
      return null;
    }
  }

  // Skip external dependencies (e.g., node_modules)
  return null;
}

export function removeIndexesFromSourceCode(
  sourceCode: string,
  indexesToRemove: { startIndex: number; endIndex: number }[],
) {
  let newSourceCode = sourceCode;

  // sort to start removing from the of the file end
  indexesToRemove.sort((a, b) => b.startIndex - a.startIndex);

  indexesToRemove.forEach(({ startIndex, endIndex }) => {
    newSourceCode =
      newSourceCode.slice(0, startIndex) + newSourceCode.slice(endIndex);
  });

  return newSourceCode;
}

export function replaceIndexesFromSourceCode(
  sourceCode: string,
  indexesToReplace: { startIndex: number; endIndex: number; text: string }[],
) {
  // sort to start removing from the end of the file
  indexesToReplace.sort((a, b) => b.startIndex - a.startIndex);

  indexesToReplace.forEach(({ startIndex, endIndex, text }) => {
    sourceCode =
      sourceCode.slice(0, startIndex) + text + sourceCode.slice(endIndex);
  });

  return sourceCode;
}
