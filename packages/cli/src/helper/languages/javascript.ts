import Parser from "tree-sitter";
import { Endpoint } from "../types";
import { getNanoApiAnnotationFromCommentValue } from "../file";

// extract the dependencies from the AST
export function extractJavascriptFileImports(node: Parser.SyntaxNode) {
  const dependencies: string[] = [];

  // Traverse the AST to find import and require statements
  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      const stringNode = node.namedChildren.find(
        (n: Parser.SyntaxNode) => n.type === "string",
      );
      if (stringNode) {
        const importName = stringNode.text.slice(1, -1); // Remove quotes
        // check if stringNode is a file path, we ignore import from node_modules
        if (importName.startsWith(".")) {
          dependencies.push(importName);
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      traverse(node.child(i) as Parser.SyntaxNode);
    }
  }

  traverse(node);
  return dependencies;
}

export function removeJavascriptAnnotations(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  endpointToKeep: Endpoint,
): string {
  let updatedSourceCode = sourceCode;
  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "comment") {
      const commentText = node.text;
      const annotationFromComment =
        getNanoApiAnnotationFromCommentValue(commentText);
      if (!annotationFromComment) return;

      if (
        annotationFromComment.path !== endpointToKeep.path ||
        annotationFromComment.method !== endpointToKeep.method
      ) {
        const nextNode = node.nextNamedSibling;
        if (!nextNode) {
          throw new Error("Could not find next node");
        }
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

export function removeInvalidJavascriptFileImports(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[],
) {
  let updatedSourceCode = sourceCode;
  const removedImportsNames: string[] = [];

  function extractImportName(node: Parser.SyntaxNode) {
    if (node.type === "string_fragment") {
      throw new Error("Invalid node type");
    }

    const importStatement = node.parent;
    if (!importStatement || importStatement.type !== "import_statement") {
      throw new Error("Invalid parent node type");
    }

    const importClause = importStatement.namedChildren.find(
      (n) => n.type === "import_clause",
    );
    if (!importClause) {
      throw new Error("Invalid import statement, missing import clause");
    }

    let importIdentifier = importClause.namedChildren.find(
      (n) => n.type === "identifier",
    );
    if (!importIdentifier) {
      const namespacImport = importClause.namedChildren.find(
        (n) => n.type === "namespace_import",
      );
      if (!namespacImport) {
        throw new Error("Invalid import statement, missing import identifier");
      }
      importIdentifier = namespacImport.namedChildren.find(
        (n) => n.type === "identifier",
      );
      if (!importIdentifier) {
        throw new Error("Invalid import statement, missing import identifier");
      }
    }

    return importIdentifier.text;
  }

  function traverse(node: Parser.SyntaxNode) {
    // TODO this handles import, we also need to handle require statements
    if (node.type === "import_statement") {
      const stringNode = node.namedChildren.find((n) => n.type === "string");
      if (stringNode) {
        const importPath = stringNode.text.slice(1, -1); // Remove quotes
        if (invalidDependencies.includes(importPath)) {
          const importName = extractImportName(stringNode);
          removedImportsNames.push(importName);

          // Remove the import statement
          updatedSourceCode = updatedSourceCode.replace(
            sourceCode.substring(node.startIndex, node.endIndex + 1),
            "",
          );
        }
      }
    }

    node.children.forEach((child) => traverse(child));
  }

  traverse(rootNode);

  return { updatedSourceCode, removedImportsNames };
}

export function removeJavascriptDeletedImportUsage(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  removedImportsNames: string[],
): string {
  let updatedSourceCode = sourceCode;

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "identifier" && removedImportsNames.includes(node.text)) {
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

export function removeUnusedJavascriptImports(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
) {
  let updatedSourceCode = sourceCode;

  // Step 1: find all the import statements node
  const importStatements: Parser.SyntaxNode[] = [];

  function traverseGetImports(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      importStatements.push(node);
    }

    node.children.forEach((child) => {
      traverseGetImports(child);
    });
  }
  traverseGetImports(rootNode);

  importStatements.forEach((importStatement) => {
    // Step 2: get all import identifiers from the import
    const importIdentifiers: Parser.SyntaxNode[] = [];

    function traverseGetImportIdentifiers(node: Parser.SyntaxNode) {
      if (node.type === "identifier") {
        importIdentifiers.push(node);
      }

      node.children.forEach((child) => {
        traverseGetImportIdentifiers(child);
      });
    }
    traverseGetImportIdentifiers(importStatement);

    let removeImportStatement = false;
    const importSpecifiersToRemove: Parser.SyntaxNode[] = [];

    importIdentifiers.forEach((importIdentifier) => {
      // Step 3: check if the import identifier is used in the source code
      let isUsed = false;

      function traverseCheckIfUsed(node: Parser.SyntaxNode) {
        if (
          node.id !== importIdentifier.id &&
          node.type === "identifier" &&
          node.text === importIdentifier.text
        ) {
          isUsed = true;
        }

        node.children.forEach((child) => {
          traverseCheckIfUsed(child);
        });
      }
      traverseCheckIfUsed(rootNode);

      // if used, we continue to the next import identifier
      if (isUsed) {
        return;
      }

      // Step 4: check if parent is import clause, eg: import express from "express";
      // or if it is a namespace import, eg: import * as express from "express";
      if (
        importIdentifier.parent?.type === "import_clause" ||
        importIdentifier.parent?.type === "namespace_import"
      ) {
        removeImportStatement = true;
        // Step 5: check if parent is import specifier, eg: import { Router } from "express";
      } else if (importIdentifier.parent?.type === "import_specifier") {
        importSpecifiersToRemove.push(importIdentifier);
      }
    });

    if (
      removeImportStatement ||
      importSpecifiersToRemove.length === importIdentifiers.length
    ) {
      updatedSourceCode = updatedSourceCode.replace(
        sourceCode.substring(
          importStatement.startIndex,
          importStatement.endIndex + 1,
        ),
        "",
      );
    } else {
      importSpecifiersToRemove.forEach((importSpecifier) => {
        updatedSourceCode = updatedSourceCode.replace(
          sourceCode.substring(
            importSpecifier.startIndex,
            importSpecifier.endIndex + 1,
          ),
          "",
        );
      });
    }
  });

  return updatedSourceCode;
}
