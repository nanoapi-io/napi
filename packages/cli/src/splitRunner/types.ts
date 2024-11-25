import Parser from "tree-sitter";

export interface File {
  path: string;
  sourceCode: string;
}

export type ExportMap = Map<
  string,
  {
    namedExports: {
      exportNode: Parser.SyntaxNode;
      identifierNode: Parser.SyntaxNode;
    }[];
    defaultExport?: Parser.SyntaxNode;
  }
>;
