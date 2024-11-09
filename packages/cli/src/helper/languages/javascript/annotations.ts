import Parser from "tree-sitter";

export function getJavascriptAnnotationNodes(
  parser: Parser,
  node: Parser.SyntaxNode,
) {
  const commentQuery = new Parser.Query(
    parser.getLanguage(),
    `
      (
        (comment) @comment
        (#match? @comment "^//( *)@nanoapi")
      )
    `,
  );

  const commentCaptures = commentQuery.captures(node);

  return commentCaptures.map((capture) => {
    return capture.node;
  });
}
