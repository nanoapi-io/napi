import { SymbolType } from "../namespaceResolver";
import { CSharpInvocationResolver, Invocations } from "../invocationResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import Parser from "tree-sitter";
import { ResolvedImports, CSharpUsingResolver } from "../usingResolver";

/**
 * Represents a dependency in a C# file.
 */
export interface CSharpDependency {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
  isNamespace?: boolean;
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
  private usingResolver: CSharpUsingResolver;
  private nsMapper: CSharpNamespaceMapper;

  /**
   * Constructs a new CSharpDependencyFormatter.
   * @param files - A map of file paths to their corresponding syntax nodes.
   */
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.nsMapper = new CSharpNamespaceMapper(files);
    this.invResolver = new CSharpInvocationResolver(this.nsMapper);
    this.usingResolver = new CSharpUsingResolver(this.nsMapper);
    for (const [fp] of files) {
      this.usingResolver.resolveUsingDirectives(fp);
    }
  }

  /**
   * Formats exported symbols into a record of CSharpSymbol.
   * @param exportedSymbols - An array of exported symbols.
   * @returns A record of symbol names to their corresponding CSharpSymbol.
   */
  private formatSymbols(
    exportedSymbols: SymbolNode[],
  ): Record<string, CSharpSymbol> {
    const symbols: Record<string, CSharpSymbol> = {};
    for (const symbol of exportedSymbols) {
      symbols[
        (symbol.namespace !== "" ? symbol.namespace + "." : "") + symbol.name
      ] = {
        id: symbol.name,
        type: symbol.type,
        lineCount: symbol.node.endPosition.row - symbol.node.startPosition.row,
        characterCount: symbol.node.endIndex - symbol.node.startIndex,
        dependents: {},
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
      const namespace = resolvedSymbol.namespace;
      const id =
        namespace !== ""
          ? namespace + "." + resolvedSymbol.name
          : resolvedSymbol.name;
      if (!dependencies[namespace]) {
        dependencies[namespace] = {
          id: namespace,
          isExternal: false,
          symbols: {},
          isNamespace: true,
        };
      }
      dependencies[namespace].symbols[id] = id;
    }
    // Add unresolved symbols as external dependencies
    // Commented because redundant : if a symbol is unresolved,
    // then the external dependency is imported through a namespace.
    // Not removed in case my analysis is inaccurate.
    // for (const unresolvedSymbol of invocations.unresolved) {
    //   dependencies[unresolvedSymbol] = {
    //     id: unresolvedSymbol,
    //     isExternal: true,
    //     symbols: {},
    //   };
    // }
    return dependencies;
  }

  private formatUsings(
    resolvedimports: ResolvedImports,
  ): Record<string, CSharpDependency> {
    const dependencies: Record<string, CSharpDependency> = {};
    for (const resolvedSymbol of resolvedimports.internal) {
      const id = resolvedSymbol.symbol
        ? (resolvedSymbol.symbol.namespace !== ""
            ? resolvedSymbol.symbol.namespace + "."
            : "") + resolvedSymbol.symbol.name
        : resolvedSymbol.namespace
          ? this.nsMapper.getFullNSName(resolvedSymbol.namespace)
          : "";
      dependencies[id] = {
        id,
        isExternal: false,
        symbols: {},
        isNamespace: resolvedSymbol.namespace !== undefined,
      };
    }
    for (const unresolvedSymbol of resolvedimports.external) {
      dependencies[unresolvedSymbol.name] = {
        id: unresolvedSymbol.name,
        isExternal: true,
        symbols: {},
        isNamespace: true,
      };
    }
    return dependencies;
  }

  /**
   * Formats a file into a CSharpFile object.
   * @param filepath - The path of the file to format.
   * @returns The formatted CSharpFile object.
   */
  public formatFile(filepath: string): CSharpFile | undefined {
    const file = this.invResolver.nsMapper.getFile(filepath);
    if (!file) {
      return undefined;
    }
    const fileSymbols = this.nsMapper.getExportsForFile(filepath);
    const fileDependencies = this.invResolver.getInvocationsFromFile(filepath);
    const formattedFile: CSharpFile = {
      id: file.path,
      filepath: file.path,
      lineCount: file.rootNode.endPosition.row,
      characterCount: file.rootNode.endIndex - file.rootNode.startIndex,
      dependencies: this.formatDependencies(fileDependencies),
      symbols: this.formatSymbols(fileSymbols),
    };
    // Add global usings to dependencies
    const globalUsings = this.formatUsings(
      this.usingResolver.getGlobalUsings(filepath),
    );
    for (const key in globalUsings) {
      if (!formattedFile.dependencies[key]) {
        formattedFile.dependencies[key] = globalUsings[key];
      }
    }
    // Add local usings to dependencies
    const localUsings = this.formatUsings(
      this.usingResolver.resolveUsingDirectives(filepath),
    );
    for (const key in localUsings) {
      if (!formattedFile.dependencies[key]) {
        formattedFile.dependencies[key] = localUsings[key];
      }
    }
    // If an internal dependency is a symbol of an imported namespace,
    // then add said symbol to the symbol list of that namespace
    for (const key in formattedFile.dependencies) {
      const dep = formattedFile.dependencies[key];
      if (!dep.isExternal && !dep.isNamespace) {
        const namespaceParts = dep.id.split(".");
        if (namespaceParts.length > 1) {
          const parentNamespace = namespaceParts.slice(0, -1).join(".");
          const parentDep = formattedFile.dependencies[parentNamespace];
          if (parentDep && !parentDep.isExternal) {
            parentDep.symbols[dep.id] = dep.id;
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete formattedFile.dependencies[key];
          }
        }
      }
    }
    return formattedFile;
  }
}
