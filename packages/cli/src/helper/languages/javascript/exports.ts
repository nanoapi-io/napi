import Parser from "tree-sitter";

export function getJavascriptExports(
  parser: Parser,
  sourceCode: string,
  isTypescript = false,
) {
  const tree = parser.parse(sourceCode);

  const exportQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (
        (export_statement) @export
        (#not-match? @export "export default")
      )
    `,
  );

  const exportCaptures = exportQuery.captures(tree.rootNode);

  const namedExports: {
    exportNode: Parser.SyntaxNode;
    identifierNode: Parser.SyntaxNode;
  }[] = [];
  exportCaptures.forEach((capture) => {
    const identifierQuery = new Parser.Query(
      parser.getLanguage(),
      isTypescript
        ? `
        declaration: ([
          (_
            name: ([(identifier) (type_identifier)]) @identifier
          )
          (_
            (_
              name: ([(identifier) (type_identifier)]) @identifier
            )
          )
        ])
      `
        : `
        declaration: ([
          (_
            name: (identifier) @identifier
          )
          (_
            (_
              name: (identifier) @identifier
            )
          )
        ])
      `,
    );

    const identifierCaptures = identifierQuery.captures(capture.node);
    if (identifierCaptures.length === 0) {
      throw new Error("No identifier found in export statement");
    }
    identifierCaptures.forEach((capture) => {
      namedExports.push({
        exportNode: capture.node,
        identifierNode: capture.node,
      });
    });
  });

  const defaultExportQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (
        (export_statement) @export
        (#match? @export "export default")
      )
    `,
  );
  const defaultExportCaptures = defaultExportQuery.captures(tree.rootNode);
  if (defaultExportCaptures.length > 1) {
    throw new Error("Found multiple default export. Only one is allowed");
  }
  if (defaultExportCaptures.length === 1) {
    return {
      namedExports,
      defaultExport: defaultExportCaptures[0].node,
    };
  }

  return {
    namedExports,
  };
}
