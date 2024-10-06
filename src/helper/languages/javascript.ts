import Parser from "tree-sitter";

// extract the dependencies from the AST
export function extractJavascriptDependencies(node: Parser.SyntaxNode) {
  const dependencies: string[] = [];

  // Traverse the AST to find import and require statements
  const traverse = (node: Parser.SyntaxNode) => {
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
  };

  traverse(node);
  return dependencies;
}
