import Parser from "tree-sitter";

export interface ExportedSymbol {
  id: string;
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  type: string;
}

export class CsharpExportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private exportedSymbolCache = new Map<string, ExportedSymbol[]>();

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = files;
  }

  private getFromExportedSymbolCache(cacheKey: string) {
    return this.exportedSymbolCache.get(cacheKey) || undefined;
  }

  private getClass(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];
    fileNode
      .descendantsOfType([
        "class_declaration",
        "struct_declaration",
        "enum_declaration",
      ])
      .forEach((node) => {
        const identifierNode = node.childForFieldName("name");
        if (!identifierNode) {
          console.error(
            "No identifier node found for class definition " + node,
          );
          return;
        }
        exportedSymbols.push({
          id: identifierNode.text,
          node,
          identifierNode,
          type: node.type.split("_")[0],
        });
      });
    return exportedSymbols;
  }

  public getSymbols(filepath: string) {
    const cacheKey = filepath;
    const cachedSymbols = this.getFromExportedSymbolCache(cacheKey);
    if (cachedSymbols) {
      return cachedSymbols;
    }

    const file = this.files.get(filepath);
    if (!file) {
      console.error("File not found for path " + filepath);
      return [];
    }

    const exportedSymbols: ExportedSymbol[] = [...this.getClass(file.rootNode)];

    this.exportedSymbolCache.set(cacheKey, exportedSymbols);
    return exportedSymbols;
  }
}
