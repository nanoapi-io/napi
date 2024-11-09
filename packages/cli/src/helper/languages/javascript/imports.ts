import Parser from "tree-sitter";

function getImportStatements(parser: Parser, node: Parser.SyntaxNode) {
  const imports: {
    node: Parser.SyntaxNode;
    source: string;
    importSpecifierIdentifiers: Parser.SyntaxNode[];
    importIdentifier?: Parser.SyntaxNode;
    namespaceImport?: Parser.SyntaxNode;
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

    const nameSpaceimportClauseIdentifierQuery = new Parser.Query(
      parser.getLanguage(),
      `
        (import_clause
          (namespace_import
            (identifier) @identifier
          )
        )
        `,
    );
    const nameSpaceimportClauseIdentifierCaptures =
      nameSpaceimportClauseIdentifierQuery.captures(capture.node);
    if (nameSpaceimportClauseIdentifierCaptures.length > 1) {
      throw new Error("Found multiple namespace import clause identifier");
    }
    const namespaceImport = nameSpaceimportClauseIdentifierCaptures.length
      ? nameSpaceimportClauseIdentifierCaptures[0].node
      : undefined;

    imports.push({
      node: capture.node,
      source,
      importSpecifierIdentifiers,
      importIdentifier,
      namespaceImport,
    });
  });

  return imports;
}

// function getRequireAndDynamicImports(parser: Parser, node: Parser.SyntaxNode) {
//   const imports: {
//     node: Parser.SyntaxNode;
//     source: string;
//     importSpecifierIdentifiers: Parser.SyntaxNode[];
//     importIdentifier?: Parser.SyntaxNode;
//     namespaceImport?: undefined;
//   }[] = [];

//   const requireStatementQuery = new Parser.Query(
//     parser.getLanguage(),
//     `
//     ([
//       (lexical_declaration
//         (variable_declarator
//           (call_expression
//             (
//               ([(identifier) (import)]) @call_expression
//               (#match? @call_expression "^(require|import)$")
//             )
//           )
//         )
//       )
//       (variable_declaration
//         (variable_declarator
//           (call_expression
//             (
//               ([(identifier) (import)]) @call_expression
//               (#match? @call_expression "^(require|import)$")
//             )
//           )
//         )
//       )
//     ]) @import
//     `,
//   );
//   let requireStatementCaptures = requireStatementQuery.captures(node);
//   requireStatementCaptures = requireStatementCaptures.filter(
//     (capture) => capture.name === "import",
//   );
//   requireStatementCaptures.forEach((capture) => {
//     const requireSourceQuery = new Parser.Query(
//       parser.getLanguage(),
//       `
//         ([
//           (lexical_declaration
//             (variable_declarator
//               value: (call_expression
//                 arguments: (arguments
//                   (string
//                     (string_fragment) @source
//                   )
//                 )
//               )
//             )
//           )
//           (variable_declaration
//             (variable_declarator
//               value: (call_expression
//                 arguments: (arguments
//                   (string
//                     (string_fragment) @source
//                   )
//                 )
//               )
//             )
//           )
//         ])
//       `,
//     );
//     const requireSourceCaptures = requireSourceQuery.captures(capture.node);
//     if (requireSourceCaptures.length === 0) {
//       throw new Error("Could not find require source");
//     }
//     if (requireSourceCaptures.length > 1) {
//       throw new Error("Found multiple require sources");
//     }
//     const source = requireSourceCaptures[0].node.text;

//     const importSpecifierIdentifierQuery = new Parser.Query(
//       parser.getLanguage(),
//       `
//         ([
//           (lexical_declaration
//             (variable_declarator
//               name: (object_pattern
//                 (shorthand_property_identifier_pattern) @identifier
//               )
//             )
//           )
//           (variable_declaration
//             (variable_declarator
//               name: (object_pattern
//                 (shorthand_property_identifier_pattern) @identifier
//               )
//             )
//           )
//         ])
//       `,
//     );

//     const importSpecifierCaptures = importSpecifierIdentifierQuery.captures(
//       capture.node,
//     );
//     const importSpecifierIdentifiers = importSpecifierCaptures.map(
//       (capture) => {
//         return capture.node;
//       },
//     );

//     const importClauseIdentifierQuery = new Parser.Query(
//       parser.getLanguage(),
//       `
//         ([
//           (lexical_declaration
//             (variable_declarator
//               name: (identifier) @identifier
//             )
//           )
//           (variable_declaration
//             (variable_declarator
//               name: (identifier) @identifier
//             )
//           )
//         ])
//       `,
//     );
//     const importClauseIdentifierCaptures = importClauseIdentifierQuery.captures(
//       capture.node,
//     );
//     if (importClauseIdentifierCaptures.length > 1) {
//       throw new Error("Found multiple import clause identifier");
//     }
//     const importIdentifier = importClauseIdentifierCaptures.length
//       ? importClauseIdentifierCaptures[0].node
//       : undefined;

//     imports.push({
//       node: capture.node,
//       source,
//       importSpecifierIdentifiers,
//       importIdentifier,
//       namespaceImport: undefined,
//     });
//   });

//   return imports;
// }

export function getJavascriptImports(parser: Parser, node: Parser.SyntaxNode) {
  const imports = getImportStatements(parser, node);
  // TODO splitting is not reliable enought with require and dynamic imports.
  // For now we do not use this.
  // imports.push(...getRequireAndDynamicImports(parser, node));

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
        ([
          (identifier)
          (type_identifier)
        ]) @identifier
        (#eq? @identifier "${identifier.text}")
      )
    `
      : `
      (
        (identifier) @identifier
        (#eq? @identifier "${identifier.text}")
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

      if (
        targetNode.parent &&
        targetNode.parent.type === "expression_statement"
      ) {
        break;
      }

      // TODO: add more cases as we encounter them

      if (!targetNode.parent) {
        break;
      }
      targetNode = targetNode.parent;
    }

    return usageNodes.push(targetNode);
  });

  return usageNodes;
}
