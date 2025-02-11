import fs from "fs";

import { DependencyTree, Group, Endpoint } from "./types";
import AnnotationManager from "../annotationManager";
import { getLanguagePlugin } from "../languagesPlugins";
import { File } from "../splitRunner/types";
import path from "path";

class DependencyTreeManager {
  entryPointPath: string;
  dependencyTree: DependencyTree;

  constructor(entryPointPath: string) {
    this.entryPointPath = entryPointPath;
    const dependencyTree = this.#getDependencyTree(
      this.entryPointPath,
      this.entryPointPath,
    );
    this.dependencyTree = dependencyTree;
  }

  #getDependencyTree(
    entryPointPath: string,
    currentFilePath: string,
  ): DependencyTree {
    const sourceCode = fs.readFileSync(currentFilePath, "utf8");

    const dependencyTree: DependencyTree = {
      path: currentFilePath,
      sourceCode,
      children: [],
    };

    const languagePlugin = getLanguagePlugin(
      path.dirname(entryPointPath),
      currentFilePath,
    );

    const tree = languagePlugin.parser.parse(sourceCode);

    const imports = languagePlugin.getImports(currentFilePath, tree.rootNode);

    imports.forEach((depImport) => {
      if (depImport.isExternal || !depImport.source) {
        // Ignore external dependencies
        return;
      }

      const childTree = this.#getDependencyTree(
        entryPointPath,
        depImport.source,
      );
      dependencyTree.children.push(childTree);
    });

    return dependencyTree;
  }

  #getChildrenFilePaths(dependencyTree: DependencyTree) {
    const filePaths: string[] = [];

    dependencyTree.children.forEach((child) => {
      filePaths.push(child.path);
      filePaths.push(...this.#getChildrenFilePaths(child));
    });

    // remove duplicates
    const uniqueFilePaths = [...new Set(filePaths)];
    return uniqueFilePaths;
  }

  #getEndpointsFromFile(
    parentFilePaths: string[],
    dependencyTree: DependencyTree,
  ) {
    const languagePlugin = getLanguagePlugin(
      this.entryPointPath,
      dependencyTree.path,
    );

    const tree = languagePlugin.parser.parse(dependencyTree.sourceCode);

    const endpoints: Endpoint[] = [];

    const annotationNodes = languagePlugin.getAnnotationNodes(tree.rootNode);

    annotationNodes.forEach((node) => {
      try {
        const annotationManager = new AnnotationManager(
          node.text,
          languagePlugin,
        );
        if (annotationManager.method) {
          const endpoint: Endpoint = {
            path: annotationManager.path,
            method: annotationManager.method,
            group: annotationManager.group,
            filePath: dependencyTree.path,
            parentFilePaths,
            childrenFilePaths: this.#getChildrenFilePaths(dependencyTree),
          };
          endpoints.push(endpoint);
        }
      } catch {
        return;
      }
    });

    return endpoints;
  }

  getEndponts(
    dependencyTree: DependencyTree = this.dependencyTree,
    parentFiles: string[] = [],
    endpoints: Endpoint[] = [],
  ) {
    // Use a Set to track unique endpoints
    const uniqueEndpoints = new Set<string>();

    // Get endpoints from the current file
    const newEndpoints = this.#getEndpointsFromFile(
      parentFiles,
      dependencyTree,
    );
    newEndpoints.forEach((endpoint) => {
      const endpointKey = `${endpoint.method}-${endpoint.path}-${endpoint.group}-${endpoint.filePath}`;
      if (!uniqueEndpoints.has(endpointKey)) {
        uniqueEndpoints.add(endpointKey);
        endpoints.push(endpoint);
      }
    });

    // Update parentFiles array for the current level
    const updatedParentFiles = [...parentFiles, dependencyTree.path];

    // Recursively process the children
    dependencyTree.children.forEach((child) => {
      this.getEndponts(child, updatedParentFiles, endpoints);
    });

    return endpoints;
  }

  getGroups() {
    const endpoints = this.getEndponts();

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

  getFiles() {
    const files: File[] = [];
    const uniquePaths = new Set<string>();

    function gatherFiles(tree: DependencyTree) {
      if (!uniquePaths.has(tree.path)) {
        uniquePaths.add(tree.path);
        files.push({ path: tree.path, sourceCode: tree.sourceCode });
      }

      tree.children.forEach(gatherFiles);
    }

    gatherFiles(this.dependencyTree);

    return files;
  }
}

export default DependencyTreeManager;
