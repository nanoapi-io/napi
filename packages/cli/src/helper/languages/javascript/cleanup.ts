import Parser from "tree-sitter";
import { Group } from "../../types";
import { parseNanoApiAnnotation, isAnnotationInGroup } from "../../annotations";
import {
  getJavascriptImports,
  getJavascriptImportIdentifierUsage,
} from "./imports";
import { removeIndexesFromSourceCode } from "../../cleanup";
import { getAnnotationNodes } from "./annotations";
import { resolveFilePath } from "../../file";

export function cleanupJavascriptAnnotations(
  parser: Parser,
  sourceCode: string,
  groupToKeep: Group,
): string {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const annotationNodes = getAnnotationNodes(parser, tree.rootNode);

  annotationNodes.forEach((node) => {
    const annotation = parseNanoApiAnnotation(node.text);

    const keepAnnotation = isAnnotationInGroup(groupToKeep, annotation);

    if (!keepAnnotation) {
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
    }
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return updatedSourceCode;
}

export function cleanupJavascriptInvalidImports(
  parser: Parser,
  filePath: string,
  sourceCode: string,
  exportIdentifiersMap: Map<
    string,
    {
      namedExports: {
        exportNode: Parser.SyntaxNode;
        identifierNode: Parser.SyntaxNode;
      }[];
      defaultExport?: Parser.SyntaxNode;
    }
  >,
) {
  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const tree = parser.parse(sourceCode);

  const depImports = getJavascriptImports(parser, tree.rootNode);
  // check if identifier exists in the imported file (as an export)
  depImports.forEach((depImport) => {
    // check if the import is a file, do not process external dependencies
    if (depImport.source.startsWith(".")) {
      const resolvedPath = resolveFilePath(depImport.source, filePath);
      if (!resolvedPath) {
        throw new Error("Could not resolve path");
      }

      const exportsForFile = exportIdentifiersMap.get(resolvedPath);
      if (!exportsForFile) {
        throw new Error("Could not find exports");
      }

      if (depImport.importIdentifier && !exportsForFile.defaultExport) {
        let usages = getJavascriptImportIdentifierUsage(
          parser,
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
          let usages = getJavascriptImportIdentifierUsage(
            parser,
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

export function cleanupUnusedJavascriptImports(
  parser: Parser,
  sourceCode: string,
) {
  const tree = parser.parse(sourceCode);

  const imports = getJavascriptImports(parser, tree.rootNode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  imports.forEach((depImport) => {
    const importSpecifierToRemove: Parser.SyntaxNode[] = [];
    depImport.importSpecifierIdentifiers.forEach((importSpecifier) => {
      let usages = getJavascriptImportIdentifierUsage(
        parser,
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
      let usages = getJavascriptImportIdentifierUsage(
        parser,
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

    if (
      importSpecifierToRemove.length ===
        depImport.importSpecifierIdentifiers.length &&
      removeDefaultImport
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
