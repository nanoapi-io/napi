import Parser from "tree-sitter";

export function getJavascriptImports(parser: Parser, node: Parser.SyntaxNode) {
  const imports: {
    node: Parser.SyntaxNode;
    source: string;
    importSpecifierIdentifiers: Parser.SyntaxNode[];
    importIdentifier?: Parser.SyntaxNode;
  }[] = [];

  const importStatementQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (import_statement) @import
    `,
  );
  const importStatementCaptures = importStatementQuery.captures(node);
  importStatementCaptures.forEach((capture) => {
    const importSourceQuery = new Parser.Query(
      parser.getLanguage(),
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
      parser.getLanguage(),
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
      parser.getLanguage(),
      `
        (import_clause
          (identifier) @identifier
        )
      `,
    );
    const importClauseIdentifierCaptures = importClauseIdentifierQuery.captures(
      capture.node,
    );
    if (importClauseIdentifierCaptures.length > 1) {
      throw new Error("Found multiple import clause identifier");
    }
    const importIdentifier = importClauseIdentifierCaptures.length
      ? importClauseIdentifierCaptures[0].node
      : undefined;

    imports.push({
      node: capture.node,
      source,
      importSpecifierIdentifiers,
      importIdentifier,
    });
  });

  return imports;
}

export function getJavascriptImportIdentifierUsage(
  parser: Parser,
  node: Parser.SyntaxNode,
  identifier: Parser.SyntaxNode,
) {
  const usageNodes: Parser.SyntaxNode[] = [];
  const identifierQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (
        ([(identifier) (type_identifier)]) @identifier
        (#match? @identifier "${identifier.text}")
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
      // TODO: add more cases

      if (!targetNode.parent) {
        break;
      }
      targetNode = targetNode.parent;
    }

    return usageNodes.push(targetNode);
  });

  return usageNodes;
}

export function getImportStatements(node: Parser.SyntaxNode) {
  const importStatements: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "import_statement") {
      importStatements.push(node);
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return importStatements;
}

export function getRequireDeclarations(node: Parser.SyntaxNode) {
  const requireStatements: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "call_expression") {
      const requireNode = node.namedChildren.find(
        (n) => n.type === "identifier" && n.text === "require",
      );
      if (requireNode) {
        let declarationNode = node;
        while (true) {
          if (
            ["variable_declaration", "lexical_declaration"].includes(
              declarationNode.type,
            )
          ) {
            break;
          }

          if (!declarationNode.parent) {
            break;
          }
          declarationNode = declarationNode.parent;
        }

        if (
          declarationNode.type === "variable_declaration" ||
          declarationNode.type === "lexical_declaration"
        ) {
          requireStatements.push(declarationNode);
        } else {
          throw new Error(
            "Unexcpected error, Could not find require declaration",
          );
        }
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return requireStatements;
}

export function getDynamicImportDeclarations(node: Parser.SyntaxNode) {
  const requireStatements: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "call_expression") {
      const importNode = node.namedChildren.find((n) => n.type === "import");
      if (importNode) {
        let declarationNode = node;
        while (true) {
          if (
            ["variable_declaration", "lexical_declaration"].includes(
              declarationNode.type,
            )
          ) {
            break;
          }

          if (!declarationNode.parent) {
            break;
          }
          declarationNode = declarationNode.parent;
        }

        if (
          declarationNode.type === "variable_declaration" ||
          declarationNode.type === "lexical_declaration"
        ) {
          requireStatements.push(declarationNode);
        } else {
          throw new Error(
            "Unexcpected error, Could not find require declaration",
          );
        }
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return requireStatements;
}

export function extractFileImportsFromImportStatements(
  importNode: Parser.SyntaxNode,
) {
  const stringNode = importNode.namedChildren.find((n) => n.type === "string");
  if (stringNode) {
    const importName = stringNode.text.slice(1, -1); // Remove quotes
    // check if stringNode is a file path, we ignore import from node_modules
    if (importName.startsWith(".")) {
      return importName;
    }
  }
}

export function extractFileImportsFromRequireDeclarations(
  requireNode: Parser.SyntaxNode,
) {
  let fileImportName: string | undefined;

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "call_expression") {
      const requireNode = node.namedChildren.find(
        (n) => n.type === "identifier" && n.text === "require",
      );
      if (requireNode) {
        const argumentsNode = node.namedChildren.find(
          (n) => n.type === "arguments",
        );
        if (!argumentsNode) {
          throw new Error("Could not find arguments node");
        }

        const stringNode = argumentsNode.namedChildren.find(
          (n) => n.type === "string",
        );
        if (!stringNode) {
          throw new Error("Could not find string node");
        }

        const importName = stringNode.text.slice(1, -1); // Remove quotes

        // check if stringNode is a file path, we ignore import from node_modules
        if (importName.startsWith(".")) {
          fileImportName = importName;
          return;
        }
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(requireNode);

  return fileImportName;
}

export function extractFileImportsFromDynamicImportDeclarations(
  requireNode: Parser.SyntaxNode,
) {
  let fileImportName: string | undefined;

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "call_expression") {
      const requireNode = node.namedChildren.find((n) => n.type === "import");
      if (requireNode) {
        const argumentsNode = node.namedChildren.find(
          (n) => n.type === "arguments",
        );
        if (!argumentsNode) {
          throw new Error("Could not find arguments node");
        }

        const stringNode = argumentsNode.namedChildren.find(
          (n) => n.type === "string",
        );
        if (!stringNode) {
          throw new Error("Could not find string node");
        }

        const importName = stringNode.text.slice(1, -1); // Remove quotes

        // check if stringNode is a file path, we ignore import from node_modules
        if (importName.startsWith(".")) {
          fileImportName = importName;
          return;
        }
      }
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(requireNode);

  return fileImportName;
}

export function extractIdentifiersFromImportStatement(node: Parser.SyntaxNode) {
  const identifier: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    if (node.type === "identifier") {
      identifier.push(node);
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return identifier;
}

export function extractIdentifiersFromRequireDeclaration(
  node: Parser.SyntaxNode,
) {
  const identifier: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    // We do not care about the identifier of the require call
    if (node.type === "call_expression") {
      return;
    }

    if (
      ["identifier", "shorthand_property_identifier_pattern"].includes(
        node.type,
      )
    ) {
      identifier.push(node);
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return identifier;
}

export function extractIdentifiersFromDynamicImportDeclaration(
  node: Parser.SyntaxNode,
) {
  const identifier: Parser.SyntaxNode[] = [];

  function traverse(node: Parser.SyntaxNode) {
    // We do not care about the identifier of the require call
    if (node.type === "call_expression") {
      return;
    }

    if (
      ["identifier", "shorthand_property_identifier_pattern"].includes(
        node.type,
      )
    ) {
      identifier.push(node);
    }

    node.children.forEach((child) => {
      traverse(child);
    });
  }

  traverse(node);

  return identifier;
}

export function extractJavascriptFileImports(
  parser: Parser,
  sourceCode: string,
) {
  const tree = parser.parse(sourceCode);

  const importNodes = getImportStatements(tree.rootNode);
  const requireNodes = getRequireDeclarations(tree.rootNode);
  const dynamicImportNodes = getDynamicImportDeclarations(tree.rootNode);

  const dependenciesFromImports: string[] = [];
  importNodes.forEach((node) => {
    const importName = extractFileImportsFromImportStatements(node);
    if (importName) {
      dependenciesFromImports.push(importName);
    }
  });

  const dependenciesFromRequires: string[] = [];
  requireNodes.forEach((node) => {
    const importName = extractFileImportsFromRequireDeclarations(node);
    if (importName) {
      dependenciesFromRequires.push(importName);
    }
  });

  const dependenciesFromDynamicImports: string[] = [];
  dynamicImportNodes.forEach((node) => {
    const importName = extractFileImportsFromDynamicImportDeclarations(node);
    if (importName) {
      dependenciesFromDynamicImports.push(importName);
    }
  });

  return [
    ...dependenciesFromImports,
    ...dependenciesFromRequires,
    ...dependenciesFromDynamicImports,
  ];
}
