import Parser from "tree-sitter";
import { LanguagePlugin, Import } from "./types";
import { Group } from "../dependencyManager/types";
import AnnotationManager from "../annotationManager";
import { removeIndexesFromSourceCode, resolveFilePath } from "../helper/file";
import Javascript from "tree-sitter-javascript";
import { ExportMap } from "../splitRunner/types";

class JavascriptPlugin implements LanguagePlugin {
  parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Javascript);
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

  getImports(node: Parser.SyntaxNode) {
    const imports: Import[] = [];

    const importStatementQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (import_statement) @import
      `,
    );
    const importStatementCaptures = importStatementQuery.captures(node);
    importStatementCaptures.forEach((capture) => {
      const importSourceQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
            source: (string
              (string_fragment) @source
            )
          `,
      );
      const importSourceCaptures = importSourceQuery.captures(capture.node);
      if (importSourceCaptures.length === 0) {
        throw new Error("Could not find import source");
      }
      if (importSourceCaptures.length > 1) {
        throw new Error("Found multiple import sources");
      }
      const source = importSourceCaptures[0].node.text;

      const importSpecifierIdentifierQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
            (import_specifier
              (identifier) @identifier
            )
          `,
      );
      const importSpecifierCaptures = importSpecifierIdentifierQuery.captures(
        capture.node,
      );
      const importSpecifierIdentifiers = importSpecifierCaptures.map(
        (capture) => {
          return capture.node;
        },
      );

      const importClauseIdentifierQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
            (import_clause
              (identifier) @identifier
            )
          `,
      );
      const importClauseIdentifierCaptures =
        importClauseIdentifierQuery.captures(capture.node);
      if (importClauseIdentifierCaptures.length > 1) {
        throw new Error("Found multiple import clause identifier");
      }
      const importIdentifier = importClauseIdentifierCaptures.length
        ? importClauseIdentifierCaptures[0].node
        : undefined;

      const nameSpaceimportClauseIdentifierQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
            (import_clause
              (namespace_import
                (identifier) @identifier
              )
            )
            `,
      );
      const nameSpaceimportClauseIdentifierCaptures =
        nameSpaceimportClauseIdentifierQuery.captures(capture.node);
      if (nameSpaceimportClauseIdentifierCaptures.length > 1) {
        throw new Error("Found multiple namespace import clause identifier");
      }
      const namespaceImport = nameSpaceimportClauseIdentifierCaptures.length
        ? nameSpaceimportClauseIdentifierCaptures[0].node
        : undefined;

      imports.push({
        node: capture.node,
        source,
        importSpecifierIdentifiers,
        importIdentifier,
        namespaceImport,
      });
    });

    return imports;
  }

  _getIdentifierUsagesQuery(identifier: Parser.SyntaxNode) {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (
          (identifier) @identifier
          (#eq? @identifier "${identifier.text}")
        )
      `,
    );
  }

  _getImportIdentifiersUsages(
    node: Parser.SyntaxNode,
    identifier: Parser.SyntaxNode,
  ) {
    const usageNodes: Parser.SyntaxNode[] = [];
    const identifierQuery = this._getIdentifierUsagesQuery(identifier);

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

    return usageNodes;
  }

  _getExportIdentifierQuery() {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        declaration: ([
          (_
            name: (identifier) @identifier
          )
          (_
            (_
              name: (identifier) @identifier
            )
          )
        ])
      `,
    );
  }

  getExports(node: Parser.SyntaxNode) {
    const exportQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (
          (export_statement) @export
          (#not-match? @export "export default")
        )
      `,
    );

    const exportCaptures = exportQuery.captures(node);
    const namedExports: {
      exportNode: Parser.SyntaxNode;
      identifierNode: Parser.SyntaxNode;
    }[] = [];

    exportCaptures.forEach((capture) => {
      const identifierQuery = this._getExportIdentifierQuery();

      const identifierCaptures = identifierQuery.captures(capture.node);
      if (identifierCaptures.length === 0) {
        throw new Error("No identifier found in export statement");
      }
      identifierCaptures.forEach((capture) => {
        namedExports.push({
          exportNode: capture.node,
          identifierNode: capture.node,
        });
      });
    });

    const defaultExportQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
          (
            (export_statement) @export
            (#match? @export "export default")
          )
        `,
    );
    const defaultExportCaptures = defaultExportQuery.captures(node);
    if (defaultExportCaptures.length > 1) {
      throw new Error("Found multiple default export. Only one is allowed");
    }
    if (defaultExportCaptures.length === 1) {
      return {
        namedExports,
        defaultExport: defaultExportCaptures[0].node,
      };
    }

    return {
      namedExports,
    };
  }

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    exportMap: ExportMap,
  ) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const tree = this.parser.parse(sourceCode);

    const imports = this.getImports(tree.rootNode);

    imports.forEach((depImport) => {
      // check if the import is a file, do not process external dependencies
      if (depImport.source.startsWith(".")) {
        const resolvedPath = resolveFilePath(depImport.source, filePath);
        if (!resolvedPath) {
          throw new Error("Could not resolve path");
        }

        const exportsForFile = exportMap.get(resolvedPath);
        if (!exportsForFile) {
          throw new Error("Could not find exports");
        }

        if (depImport.importIdentifier && !exportsForFile.defaultExport) {
          let usages = this._getImportIdentifiersUsages(
            tree.rootNode,
            depImport.importIdentifier,
          );
          usages = usages.filter((usage) => {
            return usage.id !== depImport.importIdentifier?.id;
          });
          indexesToRemove.push({
            startIndex: depImport.node.startIndex,
            endIndex: depImport.node.endIndex,
          });
          usages.forEach((usage) => {
            indexesToRemove.push({
              startIndex: usage.startIndex,
              endIndex: usage.endIndex,
            });
          });
        }

        depImport.importSpecifierIdentifiers.forEach((importSpecifier) => {
          if (
            !exportsForFile.namedExports.find(
              (namedExport) =>
                namedExport.identifierNode.text === importSpecifier.text,
            )
          ) {
            let usages = this._getImportIdentifiersUsages(
              tree.rootNode,
              importSpecifier,
            );
            usages = usages.filter((usage) => {
              return usage.id !== depImport.importIdentifier?.id;
            });

            indexesToRemove.push({
              startIndex: depImport.node.startIndex,
              endIndex: depImport.node.endIndex,
            });
            usages.forEach((usage) => {
              indexesToRemove.push({
                startIndex: usage.startIndex,
                endIndex: usage.endIndex,
              });
            });
          }
        });
      }
    });

    const updatedSourceCode = removeIndexesFromSourceCode(
      sourceCode,
      indexesToRemove,
    );

    return updatedSourceCode;
  }

  cleanupUnusedImports(sourceCode: string) {
    const tree = this.parser.parse(sourceCode);

    const imports = this.getImports(tree.rootNode);

    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    imports.forEach((depImport) => {
      const importSpecifierToRemove: Parser.SyntaxNode[] = [];
      depImport.importSpecifierIdentifiers.forEach((importSpecifier) => {
        let usages = this._getImportIdentifiersUsages(
          tree.rootNode,
          importSpecifier,
        );
        usages = usages.filter((usage) => {
          return usage.id !== importSpecifier.id;
        });

        if (usages.length === 0) {
          importSpecifierToRemove.push(importSpecifier);
        }
      });

      let removeDefaultImport = false;
      if (depImport.importIdentifier) {
        let usages = this._getImportIdentifiersUsages(
          tree.rootNode,
          depImport.importIdentifier,
        );
        usages = usages.filter((usage) => {
          return usage.id !== depImport.importIdentifier?.id;
        });

        if (usages.length === 0) {
          removeDefaultImport = true;
        }
      }

      let removeNameSpaceImport = false;
      if (depImport.namespaceImport) {
        let usages = this._getImportIdentifiersUsages(
          tree.rootNode,
          depImport.namespaceImport,
        );
        usages = usages.filter((usage) => {
          return usage.id !== depImport.importIdentifier?.id;
        });
        if (usages.length === 0) {
          removeNameSpaceImport = true;
        }
      }

      if (
        importSpecifierToRemove.length ===
          depImport.importSpecifierIdentifiers.length &&
        (removeDefaultImport || removeNameSpaceImport)
      ) {
        indexesToRemove.push({
          startIndex: depImport.node.startIndex,
          endIndex: depImport.node.endIndex,
        });
      } else {
        importSpecifierToRemove.forEach((importSpecifier) => {
          indexesToRemove.push({
            startIndex: importSpecifier.startIndex,
            endIndex: importSpecifier.endIndex,
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
