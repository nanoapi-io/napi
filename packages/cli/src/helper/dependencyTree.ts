import fs from "fs";
import Parser from "tree-sitter";

import { resolveFilePath } from "./file";
import { DependencyTree, Group } from "./types";
import { Endpoint } from "./types";
import { getParserLanguageFromFile } from "./treeSitter";
import { parseNanoApiAnnotation } from "./annotations";
import { getJavascriptAnnotationNodes } from "./languages/javascript/annotations";
import { getJavascriptImports } from "./languages/javascript/imports";
import { getTypescriptImports } from "./languages/typescript/imports";
import { getPythonImports } from "./languages/python/imports";

class DependencyTreeManager {
  private parser: Parser;
  dependencyTree: DependencyTree;

  constructor(filePath: string) {
    this.parser = new Parser();

    const dependencyTree = this.#getDependencyTree(this.parser, filePath);
    this.dependencyTree = dependencyTree;
  }

  #getDependencyTree(parser: Parser, filePath: string): DependencyTree {
    const sourceCode = fs.readFileSync(filePath, "utf8");

    const dependencyTree: DependencyTree = {
      path: filePath,
      sourceCode,
      children: [],
    };

    const language = getParserLanguageFromFile(filePath);

    parser.setLanguage(language);

    const tree = parser.parse(sourceCode);

    let imports: {
      node: Parser.SyntaxNode;
      source: string;
      importSpecifierIdentifiers: Parser.SyntaxNode[];
      importIdentifier?: Parser.SyntaxNode;
      namespaceImport?: Parser.SyntaxNode;
    }[];
    if (language.name === "javascript") {
      imports = getJavascriptImports(parser, tree.rootNode);
      imports = imports.filter((importPath) =>
        importPath.source.startsWith("."),
      );
    } else if (language.name === "typescript") {
      imports = getTypescriptImports(parser, tree.rootNode);
      imports = imports.filter((importPath) =>
        importPath.source.startsWith("."),
      );
    } else if (language.name === "python") {
      imports = getPythonImports(parser, tree.rootNode);
    } else {
      throw new Error(`Unsupported language: ${language.name}`);
    }

    imports.forEach((importPath) => {
      const resolvedPath = resolveFilePath(importPath.source, filePath);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const childTree = this.#getDependencyTree(parser, resolvedPath);
        dependencyTree.children.push(childTree);
      }
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
    const language = getParserLanguageFromFile(dependencyTree.path);
    this.parser.setLanguage(language);

    const parsedTree = this.parser.parse(dependencyTree.sourceCode);

    const endpoints: Endpoint[] = [];

    const annotationNodes = getJavascriptAnnotationNodes(
      this.parser,
      parsedTree.rootNode,
    );

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
          childrenFilePaths: this.#getChildrenFilePaths(dependencyTree),
        };
        endpoints.push(endpoint);
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
    const files: { path: string; sourceCode: string }[] = [];
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
