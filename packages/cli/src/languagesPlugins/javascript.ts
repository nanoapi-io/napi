import Parser from "tree-sitter";
import {
  LanguagePlugin,
  DepImportIdentifier,
  DepImport,
  DepExport,
  DepExportIdentifier,
} from "./types";
import { Group } from "../dependencyManager/types";
import AnnotationManager from "../annotationManager";
import { removeIndexesFromSourceCode } from "../helper/file";
import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";
import path from "path";
import fs from "fs";

class JavascriptPlugin implements LanguagePlugin {
  parser: Parser;
  entryPointPath: string;

  private isTypescript: boolean;

  constructor(entryPointPath: string, isTypescript: boolean) {
    this.entryPointPath = entryPointPath;
    this.parser = new Parser();
    this.isTypescript = isTypescript;
    const language = isTypescript ? Typescript.typescript : Javascript;
    this.parser.setLanguage(language);
  }

  commentPrefix = "//";
  annotationRegex = /\/\/( *)@nanoapi/;

  getCommentNodes(node: Parser.SyntaxNode) {
    const commentQuery = new Parser.Query(
      this.parser.getLanguage(),
      "(comment) @comment",
    );
    const commentCaptures = commentQuery.captures(node);

    return commentCaptures.map((capture) => {
      return capture.node;
    });
  }

  removeAnnotationFromOtherGroups(sourceCode: string, groupToKeep: Group) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const tree = this.parser.parse(sourceCode);

    const commentNodes = this.getCommentNodes(tree.rootNode);

    commentNodes.forEach((node) => {
      try {
        const annotationManager = new AnnotationManager(node.text, this);

        // keep annotation if in the group
        if (annotationManager.isInGroup(groupToKeep)) {
          return;
        }

        // remove the other annotations
        const nextNode = node.nextNamedSibling;
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

  #resolveImportSource(
    filePath: string,
    importSource: string,
  ): string | undefined {
    const currentFileExt = path.extname(filePath);

    const importExt = path.extname(importSource);

    // If import path has an extension, resolve directly
    if (importExt) {
      const resolvedPath = path.resolve(path.dirname(filePath), importSource);
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    }

    // If import path does not have an extension, try current file's extension first
    const resolvedPathWithCurrentExt = path.resolve(
      path.dirname(filePath),
      `${importSource}${currentFileExt}`,
    );
    if (fs.existsSync(resolvedPathWithCurrentExt)) {
      return resolvedPathWithCurrentExt;
    }

    // try to resolve with any extension
    const resolvedPath = path.resolve(path.dirname(filePath), importSource);
    try {
      const resolvedPathWithAnyExt = require.resolve(resolvedPath);
      if (fs.existsSync(resolvedPathWithAnyExt)) {
        return resolvedPathWithAnyExt;
      }
    } catch {
      // cannot resolve the path, probably external dependencies, return undefined
      return undefined;
    }
  }

  // Helper function to find the source of an import
  #findImportSource(filePath: string, importNode: Parser.SyntaxNode): string {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_statement
        source: (string
          (string_fragment) @source
        )
      )
    `,
    );
    const captures = query.captures(importNode);
    if (captures.length !== 1) {
      throw new Error(`Expected 1 import source, found ${captures.length}`);
    }

    const resolvedSource = this.#resolveImportSource(
      filePath,
      captures[0].node.text,
    );

    return resolvedSource || "";
  }

  // Helper function to find named imports
  #findNamedImports(importNode: Parser.SyntaxNode): DepImportIdentifier[] {
    const depImportIdentifiers: DepImportIdentifier[] = [];

    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
        (import_clause
          (named_imports
            (import_specifier) @importSpecifier
          )
        )
      `,
    );
    const captures = query.captures(importNode);

    captures.forEach((capture) => {
      const specifierNode = capture.node;

      const query = new Parser.Query(
        this.parser.getLanguage(),
        `
        (import_specifier
          name: (identifier) @identifier
          alias: (identifier)? @alias
        )
        `,
      );
      const c = query.captures(capture.node);

      const identifierCaptures = c.filter(
        (capture) => capture.name === "identifier",
      );
      const aliasCaptures = c.filter((capture) => capture.name === "alias");

      if (identifierCaptures.length !== 1) {
        throw new Error("Expected 1 identifier");
      }

      const identifierNode = identifierCaptures[0].node;

      if (aliasCaptures.length > 1) {
        throw new Error("Found multiple alias identifiers");
      }

      const aliasNode =
        aliasCaptures.length === 1 ? aliasCaptures[0].node : undefined;

      const depImportIdentifier: DepImportIdentifier = {
        type: "named",
        node: specifierNode,
        identifierNode,
        aliasNode,
        used: undefined,
      };

      depImportIdentifiers.push(depImportIdentifier);
    });

    return depImportIdentifiers;
  }

  // Helper function to find default import
  #findDefaultImport(
    importNode: Parser.SyntaxNode,
  ): DepImportIdentifier | undefined {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_clause
        (identifier) @defaultIdentifier
      )
      `,
    );
    const captures = query.captures(importNode);

    if (captures.length > 1) {
      throw new Error("Found multiple default import identifiers");
    }

    if (captures.length === 0) {
      return undefined;
    }

    const node = captures[0].node;

    const depImportIdentifier: DepImportIdentifier = {
      type: "default",
      node: node,
      identifierNode: node,
      used: undefined,
    };

    return depImportIdentifier;
  }

  // Helper function to find namespace imports
  #findNamespaceImport(
    importNode: Parser.SyntaxNode,
  ): DepImportIdentifier | undefined {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_clause
        (namespace_import
          (identifier) @namespaceIdentifier
        )
      )
      `,
    );
    const captures = query.captures(importNode);

    if (captures.length > 1) {
      throw new Error("Found multiple namespace import identifiers");
    }

    if (captures.length === 0) {
      return undefined;
    }

    const node = captures[0].node;
    const parentNode = node.parent;

    if (!parentNode) {
      throw new Error("Could not find parent node");
    }

    const depImportIdentifier: DepImportIdentifier = {
      type: "namespace",
      node: parentNode,
      identifierNode: node,
      used: undefined,
    };

    return depImportIdentifier;
  }

  getImports(filePath: string, node: Parser.SyntaxNode) {
    const depImports: DepImport[] = [];

    // Step 1: Find all import statements
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `(import_statement) @import`,
    );
    const importStatementNodes = query
      .captures(node)
      .map((capture) => capture.node);

    const language = this.parser.getLanguage().name;

    importStatementNodes.forEach((importNode) => {
      // Step 2: Find import source
      const source = this.#findImportSource(filePath, importNode);
      const isExternal = source ? false : true;

      // Step 3: Initialize the DepImport object
      const depImport: DepImport = {
        source: source,
        isExternal,
        node: importNode,
        identifiers: [],
        language,
      };

      const namedImports = this.#findNamedImports(importNode);
      depImport.identifiers.push(...namedImports);

      const defaultImport = this.#findDefaultImport(importNode);
      if (defaultImport) {
        depImport.identifiers.push(defaultImport);
      }

      const namespaceImport = this.#findNamespaceImport(importNode);
      if (namespaceImport) {
        depImport.identifiers.push(namespaceImport);
      }

      depImports.push(depImport);
    });

    return depImports;
  }

  #isDefaultExport(node: Parser.SyntaxNode): boolean {
    return node.text.startsWith("export default");
  }

  #findNamedExportIdentifiers(node: Parser.SyntaxNode): DepExportIdentifier[] {
    const query = new Parser.Query(
      this.parser.getLanguage(),
      this.isTypescript
        ? `
        (export_statement
          [
            (export_clause
              (export_specifier
                name: (identifier) @identifier
                alias: (identifier)? @alias
              ) @node
            )
            declaration: ([
              (function_declaration
                name: (identifier) @identifier
              )
              (class_declaration
                name: (type_identifier) @identifier
              )
              (lexical_declaration
                (variable_declarator
                  name: (identifier) @identifier
                )
              )
              (variable_declaration
                (variable_declarator
                  name: (identifier) @identifier
                )
              )
              (type_alias_declaration
                name: (type_identifier) @identifier
              )
            ])
          ]         
        )
        `
        : `
        (export_statement
          [
            (export_clause
              (export_specifier
                name: (identifier) @identifier
                alias: (identifier)? @alias
              ) @node
            )
            declaration: ([
              (function_declaration
                name: (identifier) @identifier
              )
              (class_declaration
                name: (identifier) @identifier
              )
              (lexical_declaration
                (variable_declarator
                  name: (identifier) @identifier
                )
              )
              (variable_declaration
                (variable_declarator
                  name: (identifier) @identifier
                )
              )
            ])
          ]         
        )
        `,
    );

    const captures = query.captures(node);
    const depExportIdentifiers: DepExportIdentifier[] = [];

    const nodeCaptures = captures.filter((capture) => capture.name === "node");
    const identifierCaptures = captures.filter(
      (capture) => capture.name === "identifier",
    );
    const aliasCaptures = captures.filter(
      (capture) => capture.name === "alias",
    );

    identifierCaptures.forEach((identifierCapture) => {
      const aliasCapture = aliasCaptures.find(
        (c) => c.node.parent?.id === identifierCapture.node.parent?.id,
      );

      const nodeCapture = nodeCaptures.find(
        (c) => c.node.id === identifierCapture.node.parent?.id,
      );

      depExportIdentifiers.push({
        node: nodeCapture?.node || identifierCapture.node,
        identifierNode: identifierCapture.node,
        aliasNode: aliasCapture ? aliasCapture.node : undefined,
        used: undefined,
      });
    });

    return depExportIdentifiers;
  }

  getExports(node: Parser.SyntaxNode): DepExport[] {
    const depExports: DepExport[] = [];

    const language = this.parser.getLanguage().name;

    // Step 1: Find all export statements
    const exportStatementQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (export_statement) @export
      `,
    );
    const exportStatementCaptures = exportStatementQuery.captures(node);

    exportStatementCaptures.forEach((capture) => {
      const exportNode = capture.node;

      if (this.#isDefaultExport(exportNode)) {
        // Default export
        depExports.push({
          type: "default",
          node: exportNode,
          identifiers: [], // No identifiers for default exports
          language,
        });
      } else {
        // Named export
        const namedExportIdentifiers =
          this.#findNamedExportIdentifiers(exportNode);
        depExports.push({
          type: "named",
          node: exportNode,
          identifiers: namedExportIdentifiers,
          language,
        });
      }
    });

    return depExports;
  }

  // TODO thought, we could leverage LLM to better find the usages of the import identifiers
  // This is really a case by case issue here. This implementation only works for some cases
  #getImportIdentifiersUsages(
    node: Parser.SyntaxNode,
    identifier: Parser.SyntaxNode,
  ) {
    let usageNodes: Parser.SyntaxNode[] = [];
    const identifierQuery = new Parser.Query(
      this.parser.getLanguage(),
      this.isTypescript
        ? `
        (
          ([(identifier) (type_identifier)]) @identifier
          (#eq? @identifier "${identifier.text}")
        )
        `
        : `
        (
          (identifier) @identifier
          (#eq? @identifier "${identifier.text}")
        )
      `,
    );

    const identifierCaptures = identifierQuery.captures(node);
    identifierCaptures.forEach((capture) => {
      if (capture.node.id === identifier.id) {
        return;
      }

      let targetNode = capture.node;
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

    usageNodes = usageNodes.filter(
      (usageNode) => usageNode.id !== identifier.id,
    );

    return usageNodes;
  }

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    depExportMap: Map<string, DepExport[]>,
  ) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    // Parse the source code to get the AST
    const tree = this.parser.parse(sourceCode);

    // Get all imports from the file
    const imports = this.getImports(filePath, tree.rootNode);

    imports.forEach((depImport) => {
      if (depImport.isExternal) {
        // Ignore external dependencies
        return;
      }

      if (depImport.identifiers.length === 0) {
        // Ignore side-effect-only imports (e.g., `import "module"`)
        return;
      }

      // Find exports for the current import source
      const depExport = depExportMap.get(depImport.source);

      if (!depExport) {
        // If no exports exist for the import source, mark the entire import for removal
        indexesToRemove.push({
          startIndex: depImport.node.startIndex,
          endIndex: depImport.node.endIndex,
        });

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
        if (depImportIdentifier.type === "namespace") {
          // TODO for namespace import, need to go deeper in the code to see if their usage is valid.
          // For now, we just assume they are always valid
          return;
        }

        const isValid = depExport.some((dep) => {
          // Check if the identifier matches a default export
          if (
            depImportIdentifier.type === "default" &&
            dep.type === "default"
          ) {
            return true;
          }

          // Check if the identifier matches a named export
          if (dep.type === "named") {
            return dep.identifiers.some((depExportIdentifier) => {
              const exportTargetNode =
                depExportIdentifier.aliasNode ||
                depExportIdentifier.identifierNode;
              return (
                exportTargetNode.text ===
                depImportIdentifier.identifierNode.text
              );
            });
          }

          return false;
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

      if (invalidIdentifiers.length === depImport.identifiers.length) {
        // If all identifiers are invalid, mark the entire import for removal
        indexesToRemove.push({
          startIndex: depImport.node.startIndex,
          endIndex: depImport.node.endIndex,
        });
      } else {
        // Remove only the invalid identifiers from the import statement
        invalidIdentifiers.forEach((identifierNode) => {
          indexesToRemove.push({
            startIndex: identifierNode.startIndex,
            endIndex: identifierNode.endIndex,
          });
        });
      }
    });

    // Remove invalid imports and usages from the source code
    const updatedSourceCode = removeIndexesFromSourceCode(
      sourceCode,
      indexesToRemove,
    );

    return updatedSourceCode;
  }

  cleanupUnusedImports(filePath: string, sourceCode: string) {
    const tree = this.parser.parse(sourceCode);

    const imports = this.getImports(filePath, tree.rootNode);

    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    imports.forEach((depImport) => {
      if (depImport.identifiers.length === 0) {
        // Side-effect-only imports are considered used and should not be removed
        return;
      }

      const unusedIdentifiers: Parser.SyntaxNode[] = [];

      depImport.identifiers.forEach((identifier) => {
        // Check if the identifier is used in the source code
        const usageNodes = this.#getImportIdentifiersUsages(
          tree.rootNode,
          identifier.aliasNode || identifier.identifierNode,
        );

        if (usageNodes.length === 0) {
          // If no usage nodes are found, mark the identifier as unused
          unusedIdentifiers.push(identifier.node);
        }
      });

      if (unusedIdentifiers.length === depImport.identifiers.length) {
        // If all identifiers are unused, mark the entire import statement for removal
        indexesToRemove.push({
          startIndex: depImport.node.startIndex,
          endIndex: depImport.node.endIndex,
        });
      } else {
        // Remove only the unused identifiers from the import statement
        unusedIdentifiers.forEach((unusedIdentifierNode) => {
          indexesToRemove.push({
            startIndex: unusedIdentifierNode.startIndex,
            endIndex: unusedIdentifierNode.endIndex,
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

export default JavascriptPlugin;
