import Parser from "tree-sitter";

export function getJavascriptExports(parser: Parser, sourceCode: string) {
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
      // TODO type_identifier only valid for typescript, not javascript
      `
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

// TODO OLD, DELETE IT
// export function getJavascriptExports(parser: Parser, node: Parser.SyntaxNode) {
//   const exportQuery = new Parser.Query(
//     parser.getLanguage(),
//     // TODO type_identifier only valid for typescript, not javascript
//     `
//       (
//         (export_statement
//           declaration: ([
//             (_
//               name: ([(identifier) (type_identifier)]) @identifier
//             )
//             (_
//               (_
//                 name: ([(identifier) (type_identifier)]) @identifier
//               )
//             )
//           ])
//         ) @export
//         (#not-match? @export "export default")
//       )
//     `,
//   );

//   let exportCaptures = exportQuery.captures(node);
//   exportCaptures = exportCaptures.filter((capture) => {
//     return capture.name === "identifier";
//   });
//   const namedExports = exportCaptures.map((capture) => {
//     return capture.node.text;
//   });

//   const defaultExportQuery = new Parser.Query(
//     parser.getLanguage(),
//     `
//       (
//         (export_statement) @export
//         (#match? @export "export default")
//       )
//     `,
//   );
//   const defaultExportCaptures = defaultExportQuery.captures(node);
//   if (defaultExportCaptures.length > 1) {
//     throw new Error("Found multiple default export. Only one is allowed");
//   }
//   const hasDefaultExport = defaultExportCaptures.length === 1;

//   return {
//     namedExports,
//     hasDefaultExport,
//   };
// }
