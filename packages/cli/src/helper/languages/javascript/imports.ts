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
  isTypescript = false,
) {
  const usageNodes: Parser.SyntaxNode[] = [];
  const identifierQuery = new Parser.Query(
    parser.getLanguage(),
    isTypescript
      ? `
      (
        ([(identifier) (type_identifier)]) @identifier
        (#match? @identifier "${identifier.text}")
      )
    `
      : `
      (
        (identifier) @identifier
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
