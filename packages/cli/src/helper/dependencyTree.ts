import fs from "fs";
import Parser from "tree-sitter";

import { resolveFilePath } from "./file";
import { DependencyTree, Group } from "./types";
import { Endpoint } from "./types";
import { getParserLanguageFromFile } from "./treeSitter";
import { parseNanoApiAnnotation } from "./annotations";
import { getAnnotationNodes } from "./languages/javascript/annotations";
import { getJavascriptImports } from "./languages/javascript/imports";

export function getDependencyTree(filePath: string): DependencyTree {
  const sourceCode = fs.readFileSync(filePath, "utf8");

  const dependencyTree: DependencyTree = {
    path: filePath,
    sourceCode,
    children: [],
  };

  const language = getParserLanguageFromFile(filePath);

  const parser = new Parser();
  parser.setLanguage(language);

  if (["javascript", "typescript"].includes(language.name)) {
    let imports = getJavascriptImports(
      parser,
      parser.parse(sourceCode).rootNode,
    );
    imports = imports.filter((importPath) => importPath.source.startsWith("."));

    imports.forEach((importPath) => {
      const resolvedPath = resolveFilePath(importPath.source, filePath);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        dependencyTree.children.push(getDependencyTree(resolvedPath));
      }
    });
  } else {
    throw new Error(`Unsupported language: ${language.name}`);
  }

  return dependencyTree;
}

export function getEndpontsFromTree(
  tree: DependencyTree,
  parentFiles: string[] = [],
  endpoints: Endpoint[] = [],
) {
  function getEndpointsFromFile(
    parentFilePaths: string[],
    dependencyTree: DependencyTree,
  ) {
    const language = getParserLanguageFromFile(dependencyTree.path);
    const parser = new Parser();
    parser.setLanguage(language);

    const parsedTree = parser.parse(dependencyTree.sourceCode);

    const endpoints: Endpoint[] = [];

    function getFilePathsFromTree(tree: DependencyTree) {
      const filePaths: string[] = [];

      tree.children.forEach((child) => {
        filePaths.push(child.path);
        filePaths.push(...getFilePathsFromTree(child));
      });

      // remove duplicates
      const uniqueFilePaths = [...new Set(filePaths)];

      return uniqueFilePaths;
    }

    const annotationNodes = getAnnotationNodes(parser, parsedTree.rootNode);
    annotationNodes.forEach((node) => {
      const annotation = parseNanoApiAnnotation(node.text);

      // Only add endpoints, not annotations that are just grouping endpoints
      if (annotation.method) {
        const endpoint: Endpoint = {
          path: annotation.path,
          method: annotation.method,
          group: annotation.group,
          filePath: dependencyTree.path,
          parentFilePaths,
          childrenFilePaths: getFilePathsFromTree(dependencyTree),
        };
        endpoints.push(endpoint);
      }
    });

    return endpoints;
  }

  // Use a Set to track unique endpoints
  const uniqueEndpoints = new Set<string>();

  // Get endpoints from the current file
  const newEndpoints = getEndpointsFromFile(parentFiles, tree);
  newEndpoints.forEach((endpoint) => {
    const endpointKey = `${endpoint.method}-${endpoint.path}-${endpoint.group}-${endpoint.filePath}`;
    if (!uniqueEndpoints.has(endpointKey)) {
      uniqueEndpoints.add(endpointKey);
      endpoints.push(endpoint);
    }
  });

  // Update parentFiles array for the current level
  const updatedParentFiles = [...parentFiles, tree.path];

  // Recursively process the children
  tree.children.forEach((child) => {
    getEndpontsFromTree(child, updatedParentFiles, endpoints);
  });

  return endpoints;
}

export function getGroupsFromEndpoints(endpoints: Endpoint[]) {
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

export function getFilesFromDependencyTree(
  tree: DependencyTree,
): { path: string; sourceCode: string }[] {
  const files: { path: string; sourceCode: string }[] = [];
  const uniquePaths = new Set<string>();

  function gatherFiles(tree: DependencyTree) {
    if (!uniquePaths.has(tree.path)) {
      uniquePaths.add(tree.path);
      files.push({ path: tree.path, sourceCode: tree.sourceCode });
    }

    tree.children.forEach(gatherFiles);
  }

  gatherFiles(tree);

  return files;
}
