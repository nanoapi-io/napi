import Parser from "tree-sitter";

export function getPythonImports(parser: Parser, node: Parser.SyntaxNode) {
  const imports: {
    node: Parser.SyntaxNode;
    source: string;
    importSpecifierIdentifiers: Parser.SyntaxNode[];
  }[] = [];

  const importStatementQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (import_from_statement) @import
    `,
  );
  const importStatementCaptures = importStatementQuery.captures(node);
  importStatementCaptures.forEach((capture) => {
    const importSourceQuery = new Parser.Query(
      parser.getLanguage(),
      `
        module_name: (dotted_name) @source  
      `,
    );
    const importSourceCaptures = importSourceQuery.captures(capture.node);
    if (importSourceCaptures.length === 0) {
      throw new Error("Could not find import source");
    }
    if (importSourceCaptures.length > 1) {
      throw new Error("Found multiple import sources");
    }
    // need to replace all dots to / so it is a valid path
    const source = importSourceCaptures[0].node.text.replaceAll(".", "/");

    const importSpecifierIdentifierQuery = new Parser.Query(
      parser.getLanguage(),
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
      importSpecifierIdentifiers,
    });
  });

  return imports;
}
