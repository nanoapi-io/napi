import fs from "fs";
import Parser from "tree-sitter";
import { extractJavascriptDependencies } from "./languages/javascript";
import { getParserLanguageFromFile, resolveFilePath } from "./file";
import { Dependencies } from "./types";

// extract the dependencies from the AST
export function getDependencyTree(
  filePath: string,
  visited = new Set<string>(),
) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  const tree = parser.parse(sourceCode);

  let imports: string[] = [];
  switch (language.name) {
    case "javascript":
      imports = extractJavascriptDependencies(tree.rootNode);
      break;
    case "typescript": // TypeScript is a superset of JavaScript, so we can use the same function
      imports = extractJavascriptDependencies(tree.rootNode);
      break;
    default:
      throw new Error(`Unsupported language: ${language.language}`);
  }

  const dependencies: Dependencies = {};
  imports.forEach((importPath) => {
    const resolvedPath = resolveFilePath(importPath, filePath);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      dependencies[resolvedPath] = getDependencyTree(resolvedPath, visited);
    }
  });

  return dependencies;
}

export function removeInvalidImportsAndUsages(filePath: string) {
  const language = getParserLanguageFromFile(filePath);
  const parser = new Parser();
  parser.setLanguage(language);

  const sourceCode = fs.readFileSync(filePath, "utf8");
  const tree = parser.parse(sourceCode);

  let dependencies: string[] = [];
  switch (language.name) {
    case "javascript":
      dependencies = extractJavascriptDependencies(tree.rootNode);
      break;
    case "typescript":
      dependencies = extractJavascriptDependencies(tree.rootNode);
      break;
    default:
      throw new Error(`Unsupported language: ${language.language}`);
  }

  // Check if we can resolve the path for each dependency
  // If we cannot, we need to remove it
  const invalidDependencies = dependencies.filter(
    (dep) => !resolveFilePath(dep, filePath),
  );

  const updatedCode = filterInvalidDependencies(
    tree.rootNode,
    sourceCode,
    invalidDependencies,
  );

  fs.writeFileSync(filePath, updatedCode, "utf8");
}

function filterInvalidDependencies(
  rootNode: Parser.SyntaxNode,
  sourceCode: string,
  invalidDependencies: string[],
  removedImports = new Set<string>(),
): string {
  const lines = sourceCode.split("\n");
  const importLinesToRemove = new Set<number>();
  const usageLinesToRemove = new Set<number>();

  // Traverse the AST to find import statements
  const traverse = (node: Parser.SyntaxNode) => {
    if (
      node.type === "import_statement" ||
      node.type === "variable_declarator" ||
      node.type === "import_from_statement"
    ) {
      const stringNode = node.namedChildren.find(
        (n) =>
          n.type === "string" ||
          n.type === "literal" ||
          n.type === "dotted_name",
      );
      if (
        stringNode &&
        invalidDependencies.includes(stringNode.text.slice(1, -1))
      ) {
        for (let i = node.startPosition.row; i <= node.endPosition.row; i++) {
          importLinesToRemove.add(i);
        }
        const importName = getImportName(node);
        if (importName) {
          removedImports.add(importName);
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      traverse(node.child(i) as Parser.SyntaxNode);
    }
  };

  traverse(rootNode);

  // Traverse the AST again to find usages of the removed imports
  const findUsages = (node: Parser.SyntaxNode) => {
    if (node.type === "identifier" && removedImports.has(node.text)) {
      usageLinesToRemove.add(node.startPosition.row);
    }
    for (let i = 0; i < node.childCount; i++) {
      findUsages(node.child(i) as Parser.SyntaxNode);
    }
  };

  findUsages(rootNode);

  const updatedLines = lines.filter(
    (_, index) =>
      !importLinesToRemove.has(index) && !usageLinesToRemove.has(index),
  );
  return updatedLines.join("\n");
}

function getImportName(node: Parser.SyntaxNode): string | null {
  const importClauseNode = node.namedChildren.find(
    (n) => n.type === "import_clause",
  );
  const identifierNode = importClauseNode?.namedChildren.find(
    (n) => n.type === "identifier",
  );
  return identifierNode ? identifierNode.text : null;
}
