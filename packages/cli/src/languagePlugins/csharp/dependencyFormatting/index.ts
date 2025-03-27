import { ExportedSymbol, SymbolType } from "../namespaceResolver";
import { CSharpInvocationResolver, Invocations } from "../invocationResolver";
import { CSharpNamespaceResolver } from "../namespaceResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import Parser from "tree-sitter";

export interface CSharpDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

export interface CSharpDependent {
  id: string;
  symbols: Record<string, string>;
}

export interface CSharpSymbol {
  id: string;
  type: SymbolType;
  lineCount: number;
  characterCount: number;
  dependents: Record<string, CSharpDependent>;
}

export interface CSharpFile {
  id: string;
  filepath: string;
  lineCount: number;
  characterCount: number;
  dependencies: Record<string, CSharpDependency>;
  symbols: Record<string, CSharpSymbol>;
}

export class CSharpDependencyFormatter {
  private invResolver: CSharpInvocationResolver;
  private nsMapper: CSharpNamespaceMapper;
  private nsResolver: CSharpNamespaceResolver;
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.nsMapper = new CSharpNamespaceMapper(files);
    this.invResolver = new CSharpInvocationResolver(this.nsMapper);
    this.nsResolver = new CSharpNamespaceResolver();
    this.files = files;
  }

  private findDependentSymbols(
    symbol: SymbolNode,
  ): Record<string, CSharpDependent> {
    const dependents: Record<string, CSharpDependent> = {};
    for (const filepath of this.files.keys()) {
      if (this.invResolver.isUsedInFile(filepath, symbol)) {
        dependents[filepath] = { id: filepath, symbols: {} };
      }
    }
    return dependents;
  }

  private formatSymbols(
    exportedSymbols: ExportedSymbol[],
  ): Record<string, CSharpSymbol> {
    const symbols: Record<string, CSharpSymbol> = {};
    for (const symbol of exportedSymbols) {
      symbols[symbol.name] = {
        id: symbol.name,
        type: symbol.type,
        lineCount: symbol.node.endPosition.row - symbol.node.startPosition.row,
        characterCount: symbol.node.endIndex - symbol.node.startIndex,
        dependents: this.findDependentSymbols(symbol as SymbolNode),
      };
    }
    return symbols;
  }

  private formatDependencies(
    invocations: Invocations,
  ): Record<string, CSharpDependency> {
    const dependencies: Record<string, CSharpDependency> = {};
    for (const resolvedSymbol of invocations.resolvedSymbols) {
      const id = resolvedSymbol.namespace
        ? resolvedSymbol.namespace
        : resolvedSymbol.name;
      const isExternal = resolvedSymbol.namespace ? false : true;
      dependencies[id] = {
        id,
        isExternal,
        symbols: {},
      };
    }
    for (const unresolvedSymbol of invocations.unresolved) {
      dependencies[unresolvedSymbol] = {
        id: unresolvedSymbol,
        isExternal: true,
        symbols: {},
      };
    }
    return dependencies;
  }

  public formatFile(filepath: string) {
    const file = this.invResolver.nsMapper.getFile(filepath);
    if (!file) {
      return;
    }
    const namespaces = this.nsResolver.getNamespacesFromFile(file);
    const fileSymbols = this.nsResolver.getExportsFromNamespaces(namespaces);
    const fileDependencies = this.invResolver.getInvocationsFromFile(filepath);
    const formattedFile: CSharpFile = {
      id: file.path,
      filepath: file.path,
      lineCount: file.rootNode.endPosition.row,
      characterCount: file.rootNode.endIndex - file.rootNode.startIndex,
      dependencies: this.formatDependencies(fileDependencies),
      symbols: this.formatSymbols(fileSymbols),
    };
    return formattedFile;
  }
}
