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
        if (!nextNode) {
          throw new Error("Could not find next node");
        }
        // TODO support decorator. Lots of framework uses these (eg: nestjs)
        // delete this node (comment) and the next node (api endpoint)
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
          importStatement.endIndex + 1,
        ),
        "",
      );
    }
  });

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
          requireStatement.endIndex + 1,
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

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "identifier" && removedImportsNames.includes(node)) {
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
        sourceCode.substring(parent.startIndex, parent.endIndex + 1),
        "",
      );
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(rootNode);

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
      if (isUsed) {
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
      if (isUsed) {
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

export function cleanupJavascriptFile(
  parser: Parser,
  sourceCode: string,
  group: Group,
  invalidDependencies: string[],
): string {
  let tree = parser.parse(sourceCode);

  let updatedSourceCode = removeAnnotations(tree.rootNode, sourceCode, group);

  tree = parser.parse(updatedSourceCode);

  const result = removeInvalidFileImports(
    tree.rootNode,
    updatedSourceCode,
    invalidDependencies,
  );
  updatedSourceCode = result.updatedSourceCode;
  const removedIdentifiers = result.removedIdentifiers;

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

  return updatedSourceCode;
}
