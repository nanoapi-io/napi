import dependencyTree from "dependency-tree";
import { NanoAPIAnnotation } from "./types";
import fs from "fs";
import path from "path";
import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";
import Parser from "tree-sitter";

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

export function getAnnotationsFromFile(
  parentFilePaths: string[],
  filePath: string,
  dependencyTree: dependencyTree.TreeInnerNode,
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  const tree = parser.parse(sourceCode);

  const annotations: NanoAPIAnnotation[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "comment") {
      const comment = node.text;
      if (comment.includes("@nanoapi")) {
        const annotation = parseNanoAPIAnnotation(
          parentFilePaths,
          filePath,
          dependencyTree,
          comment,
        );
        if (annotation) {
          annotations.push(annotation);
        }
      }
    }
    node.children.forEach((child) => traverse(child));
  }

  traverse(tree.rootNode);

  return annotations;
}

function parseNanoAPIAnnotation(
  parentFilePaths: string[],
  filePathstring: string,
  tree: dependencyTree.TreeInnerNode,
  annotationString: string,
) {
  const regex = /\/\/\s*@nanoapi\s+(\w+)\s+(\/\S+)/; // e.g., // @nanoapi GET /api/users
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

export function getCommentFromNanoAPIAnnotation(annotation: NanoAPIAnnotation) {
  return `@nanoapi ${annotation.method} ${annotation.path}`;
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
