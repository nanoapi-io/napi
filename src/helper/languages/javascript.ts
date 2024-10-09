import Parser from "tree-sitter";

// extract the dependencies from the AST
export function extractJavascriptFileImports(node: Parser.SyntaxNode) {
  const dependencies: string[] = [];

  // Traverse the AST to find import and require statements
  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      const stringNode = node.namedChildren.find(
        (n: Parser.SyntaxNode) => n.type === "string"
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

export function removeInvalidJavascriptFileImports(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[]
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
      (n) => n.type === "import_clause"
    );
    if (!importClause) {
      throw new Error("Invalid import statement, missing import clause");
    }

    let importIdentifier = importClause.namedChildren.find(
      (n) => n.type === "identifier"
    );
    if (!importIdentifier) {
      const namespacImport = importClause.namedChildren.find(
        (n) => n.type === "namespace_import"
      );
      if (!namespacImport) {
        throw new Error("Invalid import statement, missing import identifier");
      }
      importIdentifier = namespacImport.namedChildren.find(
        (n) => n.type === "identifier"
      );
      if (!importIdentifier) {
        throw new Error("Invalid import statement, missing import identifier");
      }
    }

    return importIdentifier.text;
  }

  function traverse(node: Parser.SyntaxNode) {
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
            ""
          );
        }
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(rootNode);

  return { updatedSourceCode, removedImportsNames };
}

export function removeJavascriptImportUsage(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  removedImportsNames: string[]
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
        ""
      );
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(rootNode);

  return updatedSourceCode;
}
