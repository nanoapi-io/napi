import Parser from "tree-sitter";
import { Group } from "../../types";
import {
  getNanoApiAnnotationFromCommentValue,
  removeIndexesFromSourceCode,
} from "../../file";
import {
  getImportStatements,
  extractFileImportsFromImportStatements,
  getRequireDeclarations,
  extractFileImportsFromRequireDeclarations,
  extractIdentifiersFromImportStatement,
  extractIdentifiersFromRequireDeclaration,
  getDynamicImportDeclarations,
  extractFileImportsFromDynamicImportDeclarations,
  extractIdentifiersFromDynamicImportDeclaration,
} from "./imports";

function removeAnnotations(
  parser: Parser,
  sourceCode: string,
  groupToKeep: Group,
): string {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "comment") {
      const commentText = node.text;
      const annotationFromComment =
        getNanoApiAnnotationFromCommentValue(commentText);
      if (!annotationFromComment) return;

      const endpointToKeep = groupToKeep.endpoints.find(
        (e) =>
          e.path === annotationFromComment.path &&
          e.method === annotationFromComment.method,
      );

      if (!endpointToKeep) {
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
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(tree.rootNode);

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return updatedSourceCode;
}

function removeInvalidFileImports(
  parser: Parser,
  sourceCode: string,
  invalidDependencies: string[],
) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const importStatements = getImportStatements(tree.rootNode);

  importStatements.forEach((importStatement) => {
    const importName = extractFileImportsFromImportStatements(importStatement);
    if (importName && invalidDependencies.includes(importName)) {
      const identifiers =
        extractIdentifiersFromImportStatement(importStatement);
      removedIdentifiers.push(...identifiers);

      // Remove the import statement
      indexesToRemove.push({
        startIndex: importStatement.startIndex,
        endIndex: importStatement.endIndex,
      });
    }
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return { updatedSourceCode, removedIdentifiers };
}

function removeInvalidFileRequires(
  parser: Parser,
  sourceCode: string,
  invalidDependencies: string[],
) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const requireStatements = getRequireDeclarations(tree.rootNode);
  requireStatements.forEach((requireStatement) => {
    const importName =
      extractFileImportsFromRequireDeclarations(requireStatement);
    if (importName && invalidDependencies.includes(importName)) {
      const identifiers =
        extractIdentifiersFromRequireDeclaration(requireStatement);
      removedIdentifiers.push(...identifiers);

      // Remove the require statement
      indexesToRemove.push({
        startIndex: requireStatement.startIndex,
        endIndex: requireStatement.endIndex,
      });
    }
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return { updatedSourceCode, removedIdentifiers };
}

function removeInvalidFileDynamicImports(
  parser: Parser,
  sourceCode: string,
  invalidDependencies: string[],
) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const dynamicImportStatements = getDynamicImportDeclarations(tree.rootNode);
  dynamicImportStatements.forEach((dynamicImportStatement) => {
    const importName = extractFileImportsFromDynamicImportDeclarations(
      dynamicImportStatement,
    );
    if (importName && invalidDependencies.includes(importName)) {
      const identifiers = extractIdentifiersFromDynamicImportDeclaration(
        dynamicImportStatement,
      );
      removedIdentifiers.push(...identifiers);

      // Remove the require statement
      indexesToRemove.push({
        startIndex: dynamicImportStatement.startIndex,
        endIndex: dynamicImportStatement.endIndex,
      });
    }
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return { updatedSourceCode, removedIdentifiers };
}

function removeDeletedImportUsage(
  parser: Parser,
  sourceCode: string,
  removedImportsNames: Parser.SyntaxNode[],
): string {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  removedImportsNames.forEach((removedImportsName) => {
    function traverse(node: Parser.SyntaxNode) {
      if (node.type === "identifier" && removedImportsName.text === node.text) {
        // find the next parent expression statement (can be several levels up)
        let parent = node.parent;

        while (parent) {
          if (parent && parent.type === "array") {
            // remove iditenfier from the array
            const endIndex =
              sourceCode.substring(node.endIndex, node.endIndex) === ","
                ? node.endIndex
                : node.endIndex;
            indexesToRemove.push({
              startIndex: node.startIndex,
              endIndex,
            });
            return;
          }

          if (parent && parent.type === "expression_statement") {
            // Remove the expression statement
            indexesToRemove.push({
              startIndex: parent.startIndex,
              endIndex: parent.endIndex,
            });
            return;
          }

          parent = parent.parent;
        }
      }

      node.children.forEach((child) => {
        traverse(child);
      });
    }

    traverse(tree.rootNode);
  });

  const updatedSourceCode = removeIndexesFromSourceCode(
    sourceCode,
    indexesToRemove,
  );

  return updatedSourceCode;
}

function isIdentifierUsed(
  node: Parser.SyntaxNode,
  identifier: Parser.SyntaxNode,
) {
  let isUsed = false;

  function traverseCheckIfUsed(node: Parser.SyntaxNode) {
    if (
      node.id !== identifier.id &&
      node.type === "identifier" &&
      node.text === identifier.text
    ) {
      isUsed = true;
      return;
    }

    node.children.forEach((child) => {
      traverseCheckIfUsed(child);
    });
  }
  traverseCheckIfUsed(node);

  return isUsed;
}

function cleanUnusedImportsStatements(parser: Parser, sourceCode: string) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const importStatements = getImportStatements(tree.rootNode);

  importStatements.forEach((importStatement) => {
    const importIdentifiers =
      extractIdentifiersFromImportStatement(importStatement);

    const importIdentifiersToRemove: Parser.SyntaxNode[] = [];

    importIdentifiers.forEach((importIdentifier) => {
      const isUsed = isIdentifierUsed(tree.rootNode, importIdentifier);
      if (!isUsed) {
        importIdentifiersToRemove.push(importIdentifier);
      }
    });

    const removeImportStatement =
      importIdentifiersToRemove.length === importIdentifiers.length;

    if (removeImportStatement) {
      indexesToRemove.push({
        startIndex: importStatement.startIndex,
        endIndex: importStatement.endIndex,
      });
    } else {
      importIdentifiersToRemove.forEach((importIdentifier) => {
        indexesToRemove.push({
          startIndex: importIdentifier.startIndex,
          endIndex: importIdentifier.endIndex,
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

function cleanUnusedRequireDeclarations(parser: Parser, sourceCode: string) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const requireDeclarations = getRequireDeclarations(tree.rootNode);

  requireDeclarations.forEach((requireDeclaration) => {
    const requireIdentifiers =
      extractIdentifiersFromRequireDeclaration(requireDeclaration);

    const requireIdentifiersToRemove: Parser.SyntaxNode[] = [];

    requireIdentifiers.forEach((requireIdentifier) => {
      const isUsed = isIdentifierUsed(tree.rootNode, requireIdentifier);
      if (!isUsed) {
        requireIdentifiersToRemove.push(requireIdentifier);
      }
    });

    const removeRequireDeclaration =
      requireIdentifiersToRemove.length === requireIdentifiers.length;

    if (removeRequireDeclaration) {
      indexesToRemove.push({
        startIndex: requireDeclaration.startIndex,
        endIndex: requireDeclaration.endIndex,
      });
    } else {
      requireIdentifiersToRemove.forEach((requireIdentifier) => {
        indexesToRemove.push({
          startIndex: requireIdentifier.startIndex,
          endIndex: requireIdentifier.endIndex,
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

function cleanUnusedDynamicImportDeclarations(
  parser: Parser,
  sourceCode: string,
) {
  const tree = parser.parse(sourceCode);

  const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

  const dynamicImportDeclarations = getDynamicImportDeclarations(tree.rootNode);

  dynamicImportDeclarations.forEach((dynamicImportDeclaration) => {
    const dynamicImportIdentifiers =
      extractIdentifiersFromDynamicImportDeclaration(dynamicImportDeclaration);

    const dynamicImportIdentifiersToRemove: Parser.SyntaxNode[] = [];

    dynamicImportIdentifiers.forEach((dynamicImportIdentifier) => {
      const isUsed = isIdentifierUsed(tree.rootNode, dynamicImportIdentifier);
      if (!isUsed) {
        dynamicImportIdentifiersToRemove.push(dynamicImportIdentifier);
      }
    });

    const removeDynamicImportDeclaration =
      dynamicImportIdentifiersToRemove.length ===
      dynamicImportIdentifiers.length;

    if (removeDynamicImportDeclaration) {
      indexesToRemove.push({
        startIndex: dynamicImportDeclaration.startIndex,
        endIndex: dynamicImportDeclaration.endIndex,
      });
    } else {
      dynamicImportIdentifiersToRemove.forEach((dynamicImportIdentifier) => {
        indexesToRemove.push({
          startIndex: dynamicImportIdentifier.startIndex,
          endIndex: dynamicImportIdentifier.endIndex,
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

export function cleanupJavascriptFile(
  parser: Parser,
  sourceCode: string,
  group: Group,
  invalidDependencies: string[],
): string {
  let updatedSourceCode = removeAnnotations(parser, sourceCode, group);

  const resultAfterImportCleaning = removeInvalidFileImports(
    parser,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterImportCleaning.updatedSourceCode;
  const removedIdentifiers = resultAfterImportCleaning.removedIdentifiers;

  const resultAfterRequireCleaning = removeInvalidFileRequires(
    parser,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterRequireCleaning.updatedSourceCode;
  removedIdentifiers.push(...resultAfterRequireCleaning.removedIdentifiers);

  const resultAfterDynamicImportCleaning = removeInvalidFileDynamicImports(
    parser,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterDynamicImportCleaning.updatedSourceCode;
  removedIdentifiers.push(
    ...resultAfterDynamicImportCleaning.removedIdentifiers,
  );

  updatedSourceCode = removeDeletedImportUsage(
    parser,
    updatedSourceCode,
    removedIdentifiers,
  );

  updatedSourceCode = cleanUnusedImportsStatements(parser, updatedSourceCode);

  updatedSourceCode = cleanUnusedRequireDeclarations(parser, updatedSourceCode);

  updatedSourceCode = cleanUnusedDynamicImportDeclarations(
    parser,
    updatedSourceCode,
  );

  return updatedSourceCode;
}
