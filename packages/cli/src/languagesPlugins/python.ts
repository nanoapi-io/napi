import Parser from "tree-sitter";
import { LanguagePlugin, Import, Export } from "./types";
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

  $resolveImportSource(resolvedImportSource: string) {
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

  $resolveModuleImportSource(importSource: string) {
    const importPath = path.resolve(
      path.dirname(this.entryPointPath),
      path.join(...importSource.split(".")),
    );

    return this.$resolveImportSource(importPath);
  }

  $resolveRelativeImportSource(filePath: string, importSouce: string) {
    const importPath = path.resolve(
      path.dirname(filePath),
      path.join(...importSouce.split(".")),
    );

    return this.$resolveImportSource(importPath);
  }

  getImports(filePath: string, node: Parser.SyntaxNode) {
    const imports: Import[] = [];

    const importStatementQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (import_from_statement) @import
      `,
    );
    const importStatementCaptures = importStatementQuery.captures(node);
    importStatementCaptures.forEach((capture) => {
      const importSourceQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
          module_name: ([
            (dotted_name) @module_source
            (relative_import) @relative_source
          ])
        `,
      );
      const importSourceCaptures = importSourceQuery.captures(capture.node);
      if (importSourceCaptures.length === 0) {
        throw new Error("Could not find import source");
      }
      if (importSourceCaptures.length > 1) {
        throw new Error("Found multiple import sources");
      }

      const { name, node } = importSourceCaptures[0];
      let source: string | undefined = undefined;
      if (name === "module_source") {
        source = this.$resolveModuleImportSource(node.text);
      } else if (name === "relative_source") {
        source = this.$resolveRelativeImportSource(filePath, node.text);
      }

      let isExternal = false;
      if (!source) {
        isExternal = true;
      }

      const importSpecifierIdentifierQuery = new Parser.Query(
        this.parser.getLanguage(),
        `
          name: (dotted_name) @identifier
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

      imports.push({
        node: capture.node,
        source,
        isExternal,
        importSpecifierIdentifiers,
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
        if (targetNode.parent && targetNode.parent.type === "list") {
          break;
        }

        if (
          targetNode.parent &&
          [
            "import_from_statement",
            "expression_statement",
            "function_definition",
            "class_definition",
          ].includes(targetNode.parent.type)
        ) {
          targetNode = targetNode.parent;
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

  getExports(node: Parser.SyntaxNode) {
    const namedExports: {
      exportNode: Parser.SyntaxNode;
      identifierNode: Parser.SyntaxNode;
    }[] = [];

    const queries = [
      // expression statement export
      {
        export: new Parser.Query(
          this.parser.getLanguage(),
          `
            (module
              (expression_statement
                (assignment
                  left: (identifier)
                )
              ) @export
            )
          `,
        ),
        identifier: new Parser.Query(
          this.parser.getLanguage(),
          `
            (expression_statement
              (assignment
                left: (identifier) @identifier
              )
            )
          `,
        ),
      },
      // function export
      {
        export: new Parser.Query(
          this.parser.getLanguage(),
          `
            (module
              (function_definition) @export
            )
          `,
        ),
        identifier: new Parser.Query(
          this.parser.getLanguage(),
          `
            (function_definition
              name: (identifier) @identifier
            )
          `,
        ),
      },
      // class export
      {
        export: new Parser.Query(
          this.parser.getLanguage(),
          `
            (module
              (class_definition) @export
            )
          `,
        ),
        identifier: new Parser.Query(
          this.parser.getLanguage(),
          `
            (class_definition
              name: (identifier) @identifier
            )
          `,
        ),
      },
      // decorated function export
      {
        export: new Parser.Query(
          this.parser.getLanguage(),
          `
            (module
              (decorated_definition
                definition: (function_definition)
              ) @export
            )
          `,
        ),
        identifier: new Parser.Query(
          this.parser.getLanguage(),
          `
            (decorated_definition
              definition: (function_definition
                name: (identifier) @identifier
              )
            )
          `,
        ),
      },
      // decorated class export
      {
        export: new Parser.Query(
          this.parser.getLanguage(),
          `
            (module
              (decorated_definition
                definition: (class_definition)
              ) @export
            )
          `,
        ),
        identifier: new Parser.Query(
          this.parser.getLanguage(),
          `
            (decorated_definition
              definition: (class_definition
                name: (identifier) @identifier
              )
            )
          `,
        ),
      },
    ];

    queries.forEach((query) => {
      const exportCaptures = query.export.captures(node);
      exportCaptures.forEach((capture) => {
        const identifierCaptures = query.identifier.captures(capture.node);
        if (identifierCaptures.length !== 1) {
          throw new Error("Could not find identifier");
        }

        const identifierNode = identifierCaptures[0].node;

        namedExports.push({
          exportNode: capture.node,
          identifierNode,
        });
      });
    });

    return {
      namedExports,
    };
  }

  cleanupInvalidImports(
    filePath: string,
    sourceCode: string,
    exportMap: Map<string, Export>,
  ) {
    const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

    const tree = this.parser.parse(sourceCode);

    const imports = this.getImports(filePath, tree.rootNode);

    imports.forEach((depImport) => {
      if (depImport.isExternal || !depImport.source) {
        // ignore external dependencies
        return;
      }

      const exportsForFile = exportMap.get(depImport.source);
      if (!exportsForFile) {
        throw new Error("Could not find exports");
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
            return usage.id !== depImport.node.id;
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
    });

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
      const importSpecifierToRemove: Parser.SyntaxNode[] = [];
      depImport.importSpecifierIdentifiers.forEach((importSpecifier) => {
        let usages = this._getImportIdentifiersUsages(
          tree.rootNode,
          importSpecifier,
        );

        usages = usages.filter((usage) => {
          return usage.id !== depImport.node.id;
        });

        if (usages.length === 0) {
          importSpecifierToRemove.push(importSpecifier);
        }
      });

      if (
        importSpecifierToRemove.length ===
        depImport.importSpecifierIdentifiers.length
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

export default PythonPlugin;
