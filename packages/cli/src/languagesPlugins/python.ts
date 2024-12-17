import Parser from "tree-sitter";
import {
  LanguagePlugin,
  DepImportIdentifier,
  DepImport,
  DepExport,
  // DepExportIdentifier,
} from "./types";
import { Group } from "../dependencyManager/types";
import AnnotationManager from "../annotationManager";
import { removeIndexesFromSourceCode } from "../helper/file";
import Python from "tree-sitter-python";
import path from "path";
import fs from "fs";

class PythonPlugin implements LanguagePlugin {
  parser: Parser;
  entryPointPath: string;

  constructor(entryPointPath: string) {
    this.entryPointPath = entryPointPath;
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  commentPrefix = "#";
  annotationRegex = /#( *)@nanoapi/;

  getAnnotationNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const commentQuery = new Parser.Query(
      this.parser.getLanguage(),
      "(comment) @comment",
    );
    const commentCaptures = commentQuery.captures(node);

    const annotationNodes: Parser.SyntaxNode[] = [];

    commentCaptures.forEach((capture) => {
      try {
        new AnnotationManager(capture.node.text, this);
        annotationNodes.push(capture.node);
      } catch {
        // Ignore invalid annotations, assume they are comments
        return;
      }
    });

    return annotationNodes;
  }

  removeAnnotationFromOtherGroups(sourceCode: string, groupToKeep: Group) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const tree = this.parser.parse(sourceCode);

    const annotationNodes = this.getAnnotationNodes(tree.rootNode);

    annotationNodes.forEach((node) => {
      try {
        const annotationManager = new AnnotationManager(node.text, this);

        // keep annotation if in the group
        if (annotationManager.isInGroup(groupToKeep)) {
          return;
        }

        let nextNode = node.nextNamedSibling;
        // We need to remove all decorators too
        while (nextNode && nextNode.type === "decorator") {
          nextNode = nextNode.nextNamedSibling;
        }
        if (!nextNode) {
          throw new Error("Could not find next node");
        }

        // Remove this node (comment) and the next node(s) (api endpoint)
        indexesToRemove.push({
          startIndex: node.startIndex,
          endIndex: nextNode.endIndex,
        });
      } catch {
        return;
      }
    });

    const updatedSourceCode = removeIndexesFromSourceCode(
      sourceCode,
      indexesToRemove,
    );

    return updatedSourceCode;
  }

  #resolveImportSource(resolvedImportSource: string) {
    for (const ext of [".py", ".pyc"]) {
      const resolvedPath = path.resolve(`${resolvedImportSource}${ext}`);
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    }

    const resolvedPath = path.resolve(resolvedImportSource);
    try {
      const resolvedPathWithAnyExt = require.resolve(resolvedPath);
      if (fs.existsSync(resolvedPathWithAnyExt)) {
        return resolvedPathWithAnyExt;
      }
    } catch {
      return undefined;
    }
  }

  #resolveModuleImportSource(importSource: string) {
    const importPath = path.resolve(
      path.dirname(this.entryPointPath),
      path.join(...importSource.split(".")),
    );

    return this.#resolveImportSource(importPath) || "";
  }

  #resolveRelativeImportSource(filePath: string, importSouce: string) {
    const importPath = path.resolve(
      path.dirname(filePath),
      path.join(...importSouce.split(".")),
    );

    return this.#resolveImportSource(importPath) || "";
  }

  #findImportSource(filePath: string, importNode: Parser.SyntaxNode) {
    const importSourceQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        module_name: ([
          (dotted_name) @module_source
          (relative_import) @relative_source
        ])
      `,
    );
    const importSourceCaptures = importSourceQuery.captures(importNode);
    if (importSourceCaptures.length === 0) {
      throw new Error("Could not find import source");
    }
    if (importSourceCaptures.length > 1) {
      throw new Error("Found multiple import sources");
    }

    const { name, node } = importSourceCaptures[0];
    const source =
      name === "module_source"
        ? this.#resolveModuleImportSource(node.text)
        : this.#resolveRelativeImportSource(filePath, node.text);

    return source;
  }

  #findImportDottedName(importNode: Parser.SyntaxNode) {
    const dottedNameQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_from_statement
        name: ([
            (dotted_name) @import
            (aliased_import) @aliasImport
        ])
      )
      `,
    );
    const captures = dottedNameQuery.captures(importNode);

    const depImportIdentifier: DepImportIdentifier[] = [];

    captures.forEach((capture) => {
      const node = capture.node;

      if (capture.name === "import") {
        const query = new Parser.Query(
          this.parser.getLanguage(),
          `
          (dotted_name
            (identifier) @identifier
          )
          `,
        );

        const identifierCaptures = query.captures(node);
        if (identifierCaptures.length !== 1) {
          throw new Error("Could not find identifier");
        }
        const identifierNode = identifierCaptures[0].node;

        depImportIdentifier.push({
          type: "named",
          node,
          identifierNode,
        });
      }

      if (capture.name === "aliasImport") {
        const query = new Parser.Query(
          this.parser.getLanguage(),
          `
          (aliased_import
            name: (dotted_name
              (identifier) @identifier
            )
            alias: (identifier) @alias
          )
          `,
        );

        const captures = query.captures(node);
        const identifierCaptures = captures.filter(
          (capture) => capture.name === "identifier",
        );
        if (identifierCaptures.length !== 1) {
          throw new Error("Could not find identifier");
        }
        const identifierNode = identifierCaptures[0].node;

        const aliasCaptures = captures.filter(
          (capture) => capture.name === "alias",
        );
        if (aliasCaptures.length > 1) {
          throw new Error("Could not find alias");
        }
        const aliasNode =
          aliasCaptures.length === 1 ? aliasCaptures[0].node : undefined;

        depImportIdentifier.push({
          type: "named",
          node,
          identifierNode,
          aliasNode,
        });
      }
    });

    return depImportIdentifier;
  }

  getImports(filePath: string, node: Parser.SyntaxNode) {
    const depImports: DepImport[] = [];

    // Step 1: Get all import statements
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `(import_from_statement) @import`,
    );
    const importStatementNodes = query
      .captures(node)
      .map((capture) => capture.node);

    const language = this.parser.getLanguage().name;

    importStatementNodes.forEach((importNode) => {
      // Step 2: Find import source
      const source = this.#findImportSource(filePath, importNode);
      const isExternal = source ? false : true;

      // Step 3: set the DepImport object
      const identifiers = this.#findImportDottedName(importNode);
      const depImport: DepImport = {
        source: source,
        isExternal,
        node: importNode,
        identifiers,
        language,
      };

      depImports.push(depImport);
    });

    return depImports;
  }

  #getExpressionAssignementExports(node: Parser.SyntaxNode) {
    const depExports: DepExport[] = [];

    const language = this.parser.getLanguage().name;

    const expressionStatementQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (expression_statement
        	(assignment
            left: (identifier) @identifier
          )
        ) @node
      )
      `,
    );

    const captures = expressionStatementQuery.captures(node);

    if (captures.length === 0) {
      return depExports;
    }

    const nodeCaptures = captures.filter((capture) => capture.name === "node");
    const identifierCaptures = captures.filter(
      (capture) => capture.name === "identifier",
    );

    nodeCaptures.forEach((nodeCapture) => {
      const subNode = nodeCapture.node;

      const idenfifierNode = identifierCaptures.find(
        (capture) =>
          capture.name === "identifier" &&
          capture.node.parent?.parent?.id === subNode.id,
      );
      if (!idenfifierNode) {
        throw new Error("Could not find identifier");
      }

      const depExport: DepExport = {
        type: "export",
        node: subNode,
        identifiers: [
          {
            node: subNode,
            identifierNode: idenfifierNode.node,
          },
        ],
        language,
      };

      depExports.push(depExport);
    });

    return depExports;
  }

  #getClassDefExports(node: Parser.SyntaxNode) {
    const depExports: DepExport[] = [];

    const language = this.parser.getLanguage().name;

    const classDefQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (class_definition
          name: (identifier) @identifier
        ) @node
      )
      `,
    );

    const captures = classDefQuery.captures(node);

    if (captures.length === 0) {
      return depExports;
    }

    const nodeCaptures = captures.filter((capture) => capture.name === "node");
    const identifierCaptures = captures.filter(
      (capture) => capture.name === "identifier",
    );

    nodeCaptures.forEach((nodeCapture) => {
      const subNode = nodeCapture.node;

      const idenfifierNode = identifierCaptures.find(
        (capture) =>
          capture.name === "identifier" &&
          capture.node.parent?.id === subNode.id,
      );
      if (!idenfifierNode) {
        throw new Error("Could not find identifier");
      }

      const depExport: DepExport = {
        type: "export",
        node: subNode,
        identifiers: [
          {
            node: subNode,
            identifierNode: idenfifierNode.node,
          },
        ],
        language,
      };

      depExports.push(depExport);
    });

    return depExports;
  }

  #getFuncDefExports(node: Parser.SyntaxNode) {
    const depExports: DepExport[] = [];

    const language = this.parser.getLanguage().name;

    const functionDefQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (function_definition
          (identifier) @identifier
        ) @node
      )
      `,
    );

    const captures = functionDefQuery.captures(node);

    if (captures.length === 0) {
      return depExports;
    }

    const nodeCaptures = captures.filter((capture) => capture.name === "node");
    const identifierCaptures = captures.filter(
      (capture) => capture.name === "identifier",
    );

    nodeCaptures.forEach((nodeCapture) => {
      const subNode = nodeCapture.node;

      const idenfifierNode = identifierCaptures.find(
        (capture) =>
          capture.name === "identifier" &&
          capture.node.parent?.id === subNode.id,
      );
      if (!idenfifierNode) {
        throw new Error("Could not find identifier");
      }

      const depExport: DepExport = {
        type: "export",
        node: subNode,
        identifiers: [
          {
            node: subNode,
            identifierNode: idenfifierNode.node,
          },
        ],
        language,
      };

      depExports.push(depExport);
    });

    return depExports;
  }

  getExports(node: Parser.SyntaxNode): DepExport[] {
    const depExports: DepExport[] = [];

    const expressionAssignementExports =
      this.#getExpressionAssignementExports(node);

    depExports.push(...expressionAssignementExports);

    const classDefExports = this.#getClassDefExports(node);

    depExports.push(...classDefExports);

    const funcDefExports = this.#getFuncDefExports(node);

    depExports.push(...funcDefExports);

    return depExports;
  }

  #getIdentifiersNode(node: Parser.SyntaxNode, identifier: Parser.SyntaxNode) {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      (
        (identifier) @identifier
        (#eq? @identifier "${identifier.text}") 
      )
      `,
    );

    const captures = query.captures(node);
    const nodes = captures.map((capture) => capture.node);

    const identifiers = nodes.filter((node) => node.id !== identifier.id);

    return identifiers;
  }

  #getImportIdentifiersUsages(
    node: Parser.SyntaxNode,
    identifier: Parser.SyntaxNode,
  ) {
    const otherIdentifiers = this.#getIdentifiersNode(node, identifier);

    const usageNodes: Parser.SyntaxNode[] = [];

    otherIdentifiers.forEach((otherIdentifier) => {
      let targetNode = otherIdentifier;
      while (true) {
        // we can remove from the array
        if (targetNode.parent && targetNode.parent.type === "array") {
          break;
        }

        if (
          targetNode.parent &&
          targetNode.parent.type === "expression_statement"
        ) {
          break;
        }

        // TODO: add more cases as we encounter them

        if (!targetNode.parent) {
          break;
        }
        targetNode = targetNode.parent;
      }

      return usageNodes.push(targetNode);
    });

    return usageNodes;
  }

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    depExportMap: Map<string, DepExport[]>,
  ) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const tree = this.parser.parse(sourceCode);

    // Get all imports from the file
    const imports = this.getImports(filePath, tree.rootNode);

    imports.forEach((depImport) => {
      if (depImport.isExternal) {
        // Ignore external dependencies
        return;
      }

      if (depImport.identifiers.length === 0) {
        // Ignore side-effect-only imports (e.g., `import module`)
        return;
      }

      // Find exports for the current import source
      const depExport = depExportMap.get(depImport.source);

      if (!depExport) {
        // Remove usages of all identifiers from this import
        depImport.identifiers.forEach((importIdentifier) => {
          const usageNodes = this.#getImportIdentifiersUsages(
            tree.rootNode,
            importIdentifier.aliasNode || importIdentifier.identifierNode,
          );

          usageNodes.forEach((usageNode) => {
            indexesToRemove.push({
              startIndex: usageNode.startIndex,
              endIndex: usageNode.endIndex,
            });
          });
        });
        return;
      }

      // Track identifiers to remove
      const invalidIdentifiers: Parser.SyntaxNode[] = [];

      // Validate each import identifier
      depImport.identifiers.forEach((depImportIdentifier) => {
        const isValid = depExport.some((dep) => {
          // Check if the identifier matches a named export
          return dep.identifiers.some((depExportIdentifier) => {
            const exportTargetNode =
              depExportIdentifier.aliasNode ||
              depExportIdentifier.identifierNode;
            return (
              exportTargetNode.text === depImportIdentifier.identifierNode.text
            );
          });
        });

        if (!isValid) {
          // Mark the identifier for removal
          invalidIdentifiers.push(depImportIdentifier.node);

          // Remove usages of the invalid identifier
          const usageNodes = this.#getImportIdentifiersUsages(
            tree.rootNode,
            depImportIdentifier.aliasNode || depImportIdentifier.identifierNode,
          );

          usageNodes.forEach((usageNode) => {
            indexesToRemove.push({
              startIndex: usageNode.startIndex,
              endIndex: usageNode.endIndex,
            });
          });
        }
      });
    });

    // Remove invalid imports and usages from the source code
    const updatedSourceCode = removeIndexesFromSourceCode(
      sourceCode,
      indexesToRemove,
    );

    return updatedSourceCode;
  }

  cleanupUnusedImports(filepath: string, sourceCode: string) {
    const tree = this.parser.parse(sourceCode);

    const imports = this.getImports(filepath, tree.rootNode);

    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    imports.forEach((depImport) => {
      if (depImport.identifiers.length === 0) {
        // Side-effect-only imports are considered used and should not be removed
        return;
      }

      const unusedIdentifiers: Parser.SyntaxNode[] = [];

      depImport.identifiers.forEach((identifier) => {
        // Check if the identifier is used in the source code
        const identifiers = this.#getIdentifiersNode(
          tree.rootNode,
          identifier.aliasNode || identifier.identifierNode,
        );

        if (identifiers.length === 0) {
          // The identifier is not used, we mark it for removal
          unusedIdentifiers.push(identifier.node);
        }
      });

      if (unusedIdentifiers.length === depImport.identifiers.length) {
        // All the identifiers are unused, we mark the import for removal
        indexesToRemove.push({
          startIndex: depImport.node.startIndex,
          endIndex: depImport.node.endIndex,
        });
      } else {
        // Remove only the unused identifiers from the import
        unusedIdentifiers.forEach((unusedIdentifier) => {
          indexesToRemove.push({
            startIndex: unusedIdentifier.startIndex,
            endIndex: unusedIdentifier.endIndex,
          });
        });
      }
    });

    const updatedSourceCode = removeIndexesFromSourceCode(
      sourceCode,
      indexesToRemove,
    );

    return updatedSourceCode;
  }
}

export default PythonPlugin;
