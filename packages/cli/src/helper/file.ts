import dependencyTree from "dependency-tree";
import { Endpoint, NanoAPIAnnotation } from "./types";
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

export function getEndpointsFromFile(
  parentFilePaths: string[],
  filePath: string,
  dependencyTree: dependencyTree.TreeInnerNode,
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  const tree = parser.parse(sourceCode);

  const endpoints: Endpoint[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "comment") {
      const comment = node.text;

      const annotation = getNanoApiAnnotationFromCommentValue(comment);

      if (annotation) {
        const endpoint: Endpoint = {
          path: annotation.path,
          method: annotation.method,
          group: annotation.group,
          filePath,
          parentFilePaths,
          childrenFilePaths: getFilePathsFromTree(dependencyTree[filePath]),
        };
        endpoints.push(endpoint);
      }
    }
    node.children.forEach((child) => traverse(child));
  }

  traverse(tree.rootNode);

  return endpoints;
}

export function getNanoApiAnnotationFromCommentValue(comment: string) {
  const nanoapiRegex = /@nanoapi|((method|path|group):([^ ]+))/g;
  const matches = comment.match(nanoapiRegex);
  // remove first match, which is the @nanoapi identifier
  matches?.shift();

  if (matches && matches.length > 0) {
    return matches.reduce((acc, match) => {
      // key, first element when split with ":"
      const key = match.split(":")[0];
      // value, everything else
      const value = match.split(":").slice(1).join(":");
      return { ...acc, [key]: value };
    }, {} as NanoAPIAnnotation);
  }

  return null;
}

export function replaceCommentFromAnnotation(
  comment: string,
  annotation: NanoAPIAnnotation,
) {
  const commentRegex = /@nanoapi\s*(.*)/g;

  // Construct the new annotation string
  let newAnnotation = "@nanoapi";
  if (annotation.method) {
    newAnnotation += ` method:${annotation.method}`;
  }
  if (annotation.path) {
    newAnnotation += ` path:${annotation.path}`;
  }
  if (annotation.group) {
    newAnnotation += ` group:${annotation.group}`;
  }

  // Replace the old annotation with the new annotation
  const updatedComment = comment.replace(commentRegex, newAnnotation);

  return updatedComment;
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
