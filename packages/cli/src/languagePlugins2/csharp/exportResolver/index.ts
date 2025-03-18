import Parser from "tree-sitter";

export const CSHARP_CLASS_TYPE = "class";
export const CSHARP_METHOD_TYPE = "method";
export const CSHARP_PROPERTY_TYPE = "property";
export const CSHARP_FIELD_TYPE = "field";

export type SymbolType =
  | typeof CSHARP_CLASS_TYPE
  | typeof CSHARP_METHOD_TYPE
  | typeof CSHARP_PROPERTY_TYPE
  | typeof CSHARP_FIELD_TYPE;

export interface ExportedSymbol {
  id: string;
  node: Parser.SyntaxNode;
  identifierNode: Parser.SyntaxNode;
  type: SymbolType;
}

export class CsharpExportResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  //private parser: Parser;
  private exportedSymbolCache = new Map<string, ExportedSymbol[]>();

  constructor(
    parser: Parser,
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.parser = parser;
    this.files = files;
  }

  private getFromExportedSymbolCache(cacheKey: string) {
    return this.exportedSymbolCache.get(cacheKey) || undefined;
  }

  private getClass(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];
    fileNode.descendantsOfType("class_declaration").forEach((node) => {
      const identifierNode = node.childForFieldName("identifier");
      if (!identifierNode) {
        console.error("No identifier node found for class definition " + node);
        return;
      }
      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: CSHARP_CLASS_TYPE,
      });
    });
    return exportedSymbols;
  }

  private getMethod(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];
    fileNode.descendantsOfType("method_declaration").forEach((node) => {
      const identifierNode = node.childForFieldName("identifier");
      if (!identifierNode) {
        console.error("No identifier node found for method definition " + node);
        return;
      }
      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: CSHARP_METHOD_TYPE,
      });
    });
    return exportedSymbols;
  }

  private getProperty(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];
    fileNode.descendantsOfType("property_declaration").forEach((node) => {
      const identifierNode = node.childForFieldName("identifier");
      if (!identifierNode) {
        console.error("No identifier node found for prop. definition " + node);
        return;
      }
      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: CSHARP_PROPERTY_TYPE,
      });
    });
    return exportedSymbols;
  }

  private getField(fileNode: Parser.SyntaxNode) {
    const exportedSymbols: ExportedSymbol[] = [];
    fileNode.descendantsOfType("field_declaration").forEach((node) => {
      const identifierNode = node.childForFieldName("identifier");
      if (!identifierNode) {
        console.error("No identifier node found for field definition " + node);
        return;
      }
      exportedSymbols.push({
        id: identifierNode.text,
        node,
        identifierNode,
        type: CSHARP_FIELD_TYPE,
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

    const exportedSymbols: ExportedSymbol[] = [
      ...this.getClass(file.rootNode),
      ...this.getMethod(file.rootNode),
      ...this.getProperty(file.rootNode),
      ...this.getField(file.rootNode),
    ];

    this.exportedSymbolCache.set(cacheKey, exportedSymbols);
    return exportedSymbols;
  }
}
