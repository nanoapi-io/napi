import dependencyTree from "dependency-tree";
import { NanoAPIAnnotation } from "./types";
import fs from "fs";
import readline from "readline";

export async function getAnnotationsFromFile(
  parentFilePaths: string[],
  filePath: string,
  tree: dependencyTree.TreeInnerNode,
  searchText: string
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
        line
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
  annotationString: string
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
