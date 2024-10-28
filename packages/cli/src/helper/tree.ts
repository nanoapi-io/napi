import fs from "fs";
import path from "path";
import { cleanupFile } from "./dependencies";
import { getEndpointsFromFile } from "./file";
import { Dependencies, Endpoint, Group, GroupMap } from "./types";

// Helper function to process the tree and gather endpoints
export function getGroupsFromTree(
  tree: Dependencies,
  parentFiles: string[] = [],
  endpoints: Endpoint[] = [],
) {
  for (const [filePath, value] of Object.entries(tree)) {
    const annotations = getEndpointsFromFile(parentFiles, filePath, tree);
    for (const annotation of annotations) {
      const endpoint = {
        method: annotation.method,
        path: annotation.path,
        group: annotation.group,
        filePath: annotation.filePath,
        parentFilePaths: annotation.parentFilePaths,
        childrenFilePaths: annotation.childrenFilePaths,
      } as Endpoint;
      endpoints.push(endpoint);
    }

    // Recursively process the tree
    if (typeof value !== "string") {
      const updatedParentFiles = [...parentFiles, filePath];
      getGroupsFromTree(value, updatedParentFiles, endpoints);
    }
  }

  const groups: Group[] = [];

  for (const endpoint of endpoints) {
    const group = groups.find((group) => group.name === endpoint.group);
    if (group) {
      group.endpoints.push(endpoint);
    } else {
      groups.push({
        name: endpoint.group || "",
        endpoints: [endpoint],
      });
    }
  }

  return groups;
}

// Function to handle splitting and storing paths based on the split command logic
export function splitPath(
  group: Group,
  outputDirectory: string,
  entrypointPath: string,
  groupMap: GroupMap,
  groupMapIndex: number,
) {
  const targetDir = path.dirname(entrypointPath);
  const annotationDirectory = path.join(
    outputDirectory,
    groupMapIndex.toString(),
  );

  // Store endpoint details in the endpoint map
  groupMap[groupMapIndex] = group;

  // Create directories and store entrypoint and dependent files
  fs.mkdirSync(annotationDirectory, { recursive: true });
  const entrypointCopyPath = path.join(
    annotationDirectory,
    path.basename(entrypointPath),
  );
  fs.copyFileSync(entrypointPath, entrypointCopyPath);

  // Copy other files based on the dependencies, remove duplicates
  const files = [
    ...new Set(
      ...group.endpoints.map((endpoint) => {
        return [
          endpoint.filePath,
          ...endpoint.parentFilePaths,
          ...endpoint.childrenFilePaths,
        ];
      }),
    ),
  ];
  for (const filePath of files) {
    const relativeFileNamePath = path.relative(targetDir, filePath);
    const destinationPath = path.join(
      annotationDirectory,
      relativeFileNamePath,
    );

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(filePath, destinationPath);
  }

  // Clean up the files based on annotations
  cleanupFile(entrypointCopyPath, group);
  for (const filePath of files) {
    const relativeFileNamePath = path.relative(targetDir, filePath);
    const destinationPath = path.join(
      annotationDirectory,
      relativeFileNamePath,
    );
    cleanupFile(destinationPath, group);
  }
}
