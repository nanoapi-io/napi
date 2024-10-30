import Parser from "tree-sitter";
import { Group } from "../../types";
import { getNanoApiAnnotationFromCommentValue } from "../../file";
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
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  groupToKeep: Group,
): string {
  let updatedSourceCode = sourceCode;

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
        const nextNode = node.nextNamedSibling;
        // TODO test this piece of code with decorators on a nestjs project
        // // We need to remove all decorators too
        // while (nextNode && nextNode.type === "decorator") {
        //   nextNode = nextNode.nextNamedSibling;
        // }
        if (!nextNode) {
          throw new Error("Could not find next node");
        }

        // delete this node (comment) and the next node(s) (api endpoint)
        updatedSourceCode = updatedSourceCode.replace(
          sourceCode.substring(node.startIndex, nextNode.endIndex + 1),
          "",
        );
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(rootNode);

  return updatedSourceCode;
}

function removeInvalidFileImports(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[],
) {
  let updatedSourceCode = sourceCode;
  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const importStatements = getImportStatements(rootNode);

  importStatements.forEach((importStatement) => {
    const importName = extractFileImportsFromImportStatements(importStatement);
    if (importName && invalidDependencies.includes(importName)) {
      const identifiers =
        extractIdentifiersFromImportStatement(importStatement);
      removedIdentifiers.push(...identifiers);

      // Remove the import statement
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          importStatement.startIndex,
          importStatement.endIndex,
        ),
        "",
      );
    }
  });

  return { updatedSourceCode, removedIdentifiers };
}

function removeInvalidFileRequires(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[],
) {
  let updatedSourceCode = sourceCode;
  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const requireStatements = getRequireDeclarations(rootNode);
  requireStatements.forEach((requireStatement) => {
    const importName =
      extractFileImportsFromRequireDeclarations(requireStatement);
    if (importName && invalidDependencies.includes(importName)) {
      const identifiers =
        extractIdentifiersFromRequireDeclaration(requireStatement);
      removedIdentifiers.push(...identifiers);

      // Remove the require statement
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          requireStatement.startIndex,
          requireStatement.endIndex,
        ),
        "",
      );
    }
  });

  return { updatedSourceCode, removedIdentifiers };
}

function removeInvalidFileDynamicImports(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[],
) {
  let updatedSourceCode = sourceCode;
  const removedIdentifiers: Parser.SyntaxNode[] = [];

  const dynamicImportStatements = getDynamicImportDeclarations(rootNode);
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
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          dynamicImportStatement.startIndex,
          dynamicImportStatement.endIndex,
        ),
        "",
      );
    }
  });

  return { updatedSourceCode, removedIdentifiers };
}

function removeDeletedImportUsage(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  removedImportsNames: Parser.SyntaxNode[],
): string {
  let updatedSourceCode = sourceCode;

  removedImportsNames.forEach((removedImportsName) => {
    function traverse(node: Parser.SyntaxNode) {
      if (node.type === "identifier" && removedImportsName.text === node.text) {
        // find the next parent expression statement (can be several levels up)
        let parent = node.parent;
        while (parent && parent.type !== "expression_statement") {
          parent = parent.parent;
        }
        if (!parent) {
          throw new Error("Could not find parent expression statement");
        }

        // Remove the expression statement
        updatedSourceCode = updatedSourceCode.replace(
          sourceCode.substring(parent.startIndex, parent.endIndex),
          "",
        );
      }

      node.children.forEach((child) => {
        traverse(child);
      });
    }

    traverse(rootNode);
  });

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

function cleanUnusedImportsStatements(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
) {
  let updatedSourceCode = sourceCode;

  const importStatements = getImportStatements(rootNode);

  importStatements.forEach((importStatement) => {
    const importIdentifiers =
      extractIdentifiersFromImportStatement(importStatement);

    const importIdentifiersToRemove: Parser.SyntaxNode[] = [];

    importIdentifiers.forEach((importIdentifier) => {
      const isUsed = isIdentifierUsed(rootNode, importIdentifier);
      if (!isUsed) {
        importIdentifiersToRemove.push(importIdentifier);
      }
    });

    const removeImportStatement =
      importIdentifiersToRemove.length === importIdentifiers.length;

    if (removeImportStatement) {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          importStatement.startIndex,
          importStatement.endIndex + 1,
        ),
        "",
      );
    }

    importIdentifiersToRemove.forEach((importIdentifier) => {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          importIdentifier.startIndex,
          importIdentifier.endIndex + 1,
        ),
        "",
      );
    });
  });

  return updatedSourceCode;
}

function cleanUnusedRequireDeclarations(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
) {
  let updatedSourceCode = sourceCode;

  const requireDeclarations = getRequireDeclarations(rootNode);

  requireDeclarations.forEach((requireDeclaration) => {
    const requireIdentifiers =
      extractIdentifiersFromRequireDeclaration(requireDeclaration);

    const requireIdentifiersToRemove: Parser.SyntaxNode[] = [];

    requireIdentifiers.forEach((requireIdentifier) => {
      const isUsed = isIdentifierUsed(rootNode, requireIdentifier);
      if (!isUsed) {
        requireIdentifiersToRemove.push(requireIdentifier);
      }
    });

    const removeRequireDeclaration =
      requireIdentifiersToRemove.length === requireIdentifiers.length;

    if (removeRequireDeclaration) {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          requireDeclaration.startIndex,
          requireDeclaration.endIndex + 1,
        ),
        "",
      );
    }

    requireIdentifiersToRemove.forEach((requireIdentifier) => {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          requireIdentifier.startIndex,
          requireIdentifier.endIndex + 1,
        ),
        "",
      );
    });
  });

  return updatedSourceCode;
}

function cleanUnusedDynamicImportDeclarations(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
) {
  let updatedSourceCode = sourceCode;

  const dynamicImportDeclarations = getDynamicImportDeclarations(rootNode);

  dynamicImportDeclarations.forEach((dynamicImportDeclaration) => {
    const dynamicImportIdentifiers =
      extractIdentifiersFromDynamicImportDeclaration(dynamicImportDeclaration);

    const dynamicImportIdentifiersToRemove: Parser.SyntaxNode[] = [];

    dynamicImportIdentifiers.forEach((dynamicImportIdentifier) => {
      const isUsed = isIdentifierUsed(rootNode, dynamicImportIdentifier);
      if (!isUsed) {
        dynamicImportIdentifiersToRemove.push(dynamicImportIdentifier);
      }
    });

    const removeDynamicImportDeclaration =
      dynamicImportIdentifiersToRemove.length ===
      dynamicImportIdentifiers.length;

    if (removeDynamicImportDeclaration) {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          dynamicImportDeclaration.startIndex,
          dynamicImportDeclaration.endIndex + 1,
        ),
        "",
      );
    }

    dynamicImportIdentifiersToRemove.forEach((dynamicImportIdentifier) => {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          dynamicImportIdentifier.startIndex,
          dynamicImportIdentifier.endIndex + 1,
        ),
        "",
      );
    });
  });

  return updatedSourceCode;
}

export function cleanupJavascriptFile(
  parser: Parser,
  sourceCode: string,
  group: Group,
  invalidDependencies: string[],
): string {
  let tree = parser.parse(sourceCode);

  let updatedSourceCode = removeAnnotations(tree.rootNode, sourceCode, group);

  tree = parser.parse(updatedSourceCode);

  const resultAfterImportCleaning = removeInvalidFileImports(
    tree.rootNode,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterImportCleaning.updatedSourceCode;
  const removedIdentifiers = resultAfterImportCleaning.removedIdentifiers;

  tree = parser.parse(updatedSourceCode);

  const resultAfterRequireCleaning = removeInvalidFileRequires(
    tree.rootNode,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterRequireCleaning.updatedSourceCode;
  removedIdentifiers.push(...resultAfterRequireCleaning.removedIdentifiers);

  tree = parser.parse(updatedSourceCode);

  const resultAfterDynamicImportCleaning = removeInvalidFileDynamicImports(
    tree.rootNode,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = resultAfterDynamicImportCleaning.updatedSourceCode;
  removedIdentifiers.push(
    ...resultAfterDynamicImportCleaning.removedIdentifiers,
  );

  tree = parser.parse(updatedSourceCode);

  updatedSourceCode = removeDeletedImportUsage(
    tree.rootNode,
    updatedSourceCode,
    removedIdentifiers,
  );

  tree = parser.parse(updatedSourceCode);

  updatedSourceCode = cleanUnusedImportsStatements(
    tree.rootNode,
    updatedSourceCode,
  );

  tree = parser.parse(updatedSourceCode);

  updatedSourceCode = cleanUnusedRequireDeclarations(
    tree.rootNode,
    updatedSourceCode,
  );

  tree = parser.parse(updatedSourceCode);

  updatedSourceCode = cleanUnusedDynamicImportDeclarations(
    tree.rootNode,
    updatedSourceCode,
  );

  return updatedSourceCode;
}
