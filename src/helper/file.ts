import dependencyTree from "dependency-tree";
import { NanoAPIAnnotation } from "./types";
import fs from "fs";
import path from "path";
import readline from "readline";
import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";

export function cleanupOutputDir(outputDir: string) {
  const splitDirectory = path.join(outputDir, "nanoapi-split");
  if (fs.existsSync(splitDirectory)) {
    fs.rmSync(splitDirectory, { recursive: true });
  }
}

export function createOutputDir(outputDir: string) {
  const splitDirectory = path.join(outputDir, "nanoapi-split");
  fs.mkdirSync(splitDirectory, { recursive: true });
}

export function getParserLanguageFromFile(filePath: string) {
  const ext = filePath.split(".").pop();

  switch (ext) {
    case "js":
      return Javascript;
    case "ts":
      return Typescript.typescript;
    case "tsx": // TODO this is untested
      return Typescript.tsx;
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

export async function getAnnotationsFromFile(
  parentFilePaths: string[],
  filePath: string,
  tree: dependencyTree.TreeInnerNode,
  searchText: string,
) {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const annotations: NanoAPIAnnotation[] = [];

  for await (const line of rl) {
    if (line.includes(searchText)) {
      const annotation = parseNanoAPIAnnotation(
        parentFilePaths,
        filePath,
        tree,
        line,
      );
      if (annotation) {
        annotations.push(annotation);
      }
    }
  }

  return annotations;
}

function parseNanoAPIAnnotation(
  parentFilePaths: string[],
  filePathstring: string,
  tree: dependencyTree.TreeInnerNode,
  annotationString: string,
) {
  const regex = /\/\/\s*@nanoapi\s+(\w+)\s+(\/\S+)/;
  const match = annotationString.match(regex);
  if (!match) {
    return undefined;
  }

  return {
    method: match[1],
    path: match[2],
    filePaths: [
      ...parentFilePaths,
      filePathstring,
      ...getFilePathsFromTree(tree[filePathstring]),
    ],
  } as NanoAPIAnnotation;
}

function getFilePathsFromTree(tree: dependencyTree.Tree) {
  const filePaths: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    filePaths.push(key);
    if (typeof value !== "string") {
      filePaths.push(...getFilePathsFromTree(value));
    }
  }

  return filePaths;
}

// Resolve file paths from import/require statements
export function resolveFilePath(
  importPath: string,
  currentFile: string,
): string | null {
  const currentFileExt = path.extname(currentFile);
  const importExt = path.extname(importPath);

  if (importPath.startsWith(".")) {
    if (importExt) {
      // If import path has an extension, resolve directly
      const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    } else {
      // If import path does not have an extension, try current file's extension first
      const resolvedPathWithCurrentExt = path.resolve(
        path.dirname(currentFile),
        `${importPath}${currentFileExt}`,
      );
      if (fs.existsSync(resolvedPathWithCurrentExt)) {
        return resolvedPathWithCurrentExt;
      }
    }
  }
  // Skip external dependencies (e.g., node_modules)
  return null;
}
