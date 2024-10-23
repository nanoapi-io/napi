import fs from "fs";
import path from "path";
import { cleanupFile } from "./dependencies";
import { getEndpointsFromFile } from "./file";
import { Dependencies, Endpoint } from "./types";

// Helper function to process the tree and gather endpoints
export function iterateOverTree(
  tree: Dependencies,
  parentFiles: string[] = [],
  endpoints: Endpoint[] = [],
): Endpoint[] {
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
      iterateOverTree(value, updatedParentFiles, endpoints);
    }
  }
  return endpoints;
}

// Function to handle splitting and storing paths based on the split command logic
export function splitPath(
  endpoint: Endpoint,
  outputDirectory: string,
  entrypointPath: string,
  endpointMap: Record<number, { method?: string; path: string }>,
  endpointIndex: number,
) {
  const targetDir = path.dirname(entrypointPath);
  const annotationDirectory = path.join(
    outputDirectory,
    endpointIndex.toString(),
  );

  // Store endpoint details in the endpoint map
  endpointMap[endpointIndex] = {
    method: endpoint.method,
    path: endpoint.path,
  };

  // Create directories and store entrypoint and dependent files
  fs.mkdirSync(annotationDirectory, { recursive: true });
  const entrypointCopyPath = path.join(
    annotationDirectory,
    path.basename(entrypointPath),
  );
  fs.copyFileSync(entrypointPath, entrypointCopyPath);

  // Copy other files based on the dependencies
  for (const filePath of [
    endpoint.filePath,
    ...endpoint.parentFilePaths,
    ...endpoint.childrenFilePaths,
  ]) {
    const relativeFileNamePath = path.relative(targetDir, filePath);
    const destinationPath = path.join(
      annotationDirectory,
      relativeFileNamePath,
    );

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(filePath, destinationPath);
  }

  // Clean up the files based on annotations
  cleanupFile(entrypointCopyPath, endpoint);
  for (const filePath of [
    endpoint.filePath,
    ...endpoint.parentFilePaths,
    ...endpoint.childrenFilePaths,
  ]) {
    const relativeFileNamePath = path.relative(targetDir, filePath);
    const destinationPath = path.join(
      annotationDirectory,
      relativeFileNamePath,
    );
    cleanupFile(destinationPath, endpoint);
  }
}
