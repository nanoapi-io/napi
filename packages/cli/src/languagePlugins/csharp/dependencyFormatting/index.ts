import { ExportedSymbol, SymbolType } from "../namespaceResolver";
import { CSharpInvocationResolver, Invocations } from "../invocationResolver";
import { CSharpNamespaceResolver } from "../namespaceResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import Parser from "tree-sitter";

/**
 * Represents a dependency in a C# file.
 */
export interface CSharpDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

/**
 * Represents a dependent in a C# file.
 */
export interface CSharpDependent {
  id: string;
  symbols: Record<string, string>;
}

/**
 * Represents a symbol in a C# file.
 */
export interface CSharpSymbol {
  id: string;
  type: SymbolType;
  lineCount: number;
  characterCount: number;
  dependents: Record<string, CSharpDependent>;
}

/**
 * Represents a C# file with its metadata and dependencies.
 */
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

  /**
   * Constructs a new CSharpDependencyFormatter.
   * @param files - A map of file paths to their corresponding syntax nodes.
   */
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.nsMapper = new CSharpNamespaceMapper(files);
    this.invResolver = new CSharpInvocationResolver(this.nsMapper);
    this.nsResolver = new CSharpNamespaceResolver();
    this.files = files;
  }

  /**
   * Finds all dependent symbols for a given symbol.
   * @param symbol - The symbol node to find dependents for.
   * @returns A record of file paths to their corresponding dependents.
   */
  private findDependentSymbols(
    symbol: SymbolNode,
  ): Record<string, CSharpDependent> {
    const dependents: Record<string, CSharpDependent> = {};
    for (const filepath of this.files.keys()) {
      for (const sbl of this.invResolver.getDependentsForSymbol(
        filepath,
        symbol,
      )) {
        if (!dependents[filepath]) {
          dependents[filepath] = {
            id: filepath,
            symbols: {},
          };
        }
        dependents[filepath].symbols[sbl] = sbl;
      }
    }
    return dependents;
  }

  /**
   * Formats exported symbols into a record of CSharpSymbol.
   * @param exportedSymbols - An array of exported symbols.
   * @returns A record of symbol names to their corresponding CSharpSymbol.
   */
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

  /**
   * Formats invocations into a record of CSharpDependency.
   * @param invocations - The invocations to format.
   * @returns A record of dependency IDs to their corresponding CSharpDependency.
   */
  private formatDependencies(
    invocations: Invocations,
  ): Record<string, CSharpDependency> {
    const dependencies: Record<string, CSharpDependency> = {};
    for (const resolvedSymbol of invocations.resolvedSymbols) {
      const id = resolvedSymbol.namespace
        ? resolvedSymbol.namespace
        : resolvedSymbol.name;
      dependencies[id] = {
        id,
        isExternal: false,
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

  /**
   * Formats a file into a CSharpFile object.
   * @param filepath - The path of the file to format.
   * @returns The formatted CSharpFile object.
   */
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
