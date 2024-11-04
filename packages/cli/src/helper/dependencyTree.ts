import fs from "fs";
import Parser from "tree-sitter";
import { extractJavascriptFileImports } from "./languages/javascript/imports";

import { resolveFilePath } from "./file";
import { DependencyTree, Group } from "./types";
import { Endpoint } from "./types";
import { getParserLanguageFromFile } from "./treeSitter";
import { getNanoApiAnnotationFromCommentValue } from "./annotations";

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
    const imports = extractJavascriptFileImports(parser, sourceCode);

    imports.forEach((importPath) => {
      const resolvedPath = resolveFilePath(importPath, filePath);
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

    function traverse(node: Parser.SyntaxNode) {
      if (node.type === "comment") {
        const comment = node.text;

        const annotation = getNanoApiAnnotationFromCommentValue(comment);

        if (annotation) {
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
      }
      node.children.forEach((child) => traverse(child));
    }

    traverse(parsedTree.rootNode);

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
