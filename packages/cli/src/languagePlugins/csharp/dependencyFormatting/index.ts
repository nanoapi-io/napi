import { SymbolType } from "../namespaceResolver";
import { CSharpInvocationResolver, Invocations } from "../invocationResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import Parser from "tree-sitter";
import { ResolvedImports, CSharpUsingResolver } from "../usingResolver";
import { CSharpProjectMapper } from "../projectMapper";

/**
 * Represents a dependency in a C# file.
 */
export interface CSharpDependency {
  /**
   * The unique identifier of the dependency.
   */
  id: string;
  /**
   * Indicates whether the dependency is external.
   */
  isExternal: boolean;
  /**
   * A record of symbols associated with the dependency.
   */
  symbols: Record<string, string>;
  /**
   * Indicates whether the dependency is a namespace.
   */
  isNamespace?: boolean;
}

/**
 * Represents a dependent in a C# file.
 */
export interface CSharpDependent {
  /**
   * The unique identifier of the dependent.
   */
  id: string;
  /**
   * A record of symbols associated with the dependent.
   */
  symbols: Record<string, string>;
}

/**
 * Represents a symbol in a C# file.
 */
export interface CSharpSymbol {
  /**
   * The unique identifier of the symbol.
   */
  id: string;
  /**
   * The type of the symbol.
   */
  type: SymbolType;
  /**
   * The number of lines the symbol spans.
   */
  lineCount: number;
  /**
   * The number of characters the symbol spans.
   */
  characterCount: number;
  /**
   * A record of dependents associated with the symbol.
   */
  dependents: Record<string, CSharpDependent>;
  /**
   * A record of dependencies associated with the symbol.
   */
  dependencies: Record<string, CSharpDependency>;
}

/**
 * Represents a C# file with its metadata and dependencies.
 */
export interface CSharpFile {
  /**
   * The unique identifier of the file.
   */
  id: string;
  /**
   * The file path of the C# file.
   */
  filepath: string;
  /**
   * The number of lines in the file.
   */
  lineCount: number;
  /**
   * The number of characters in the file.
   */
  characterCount: number;
  /**
   * A record of dependencies associated with the file.
   */
  dependencies: Record<string, CSharpDependency>;
  /**
   * A record of symbols defined in the file.
   */
  symbols: Record<string, CSharpSymbol>;
}

export class CSharpDependencyFormatter {
  private invResolver: CSharpInvocationResolver;
  private usingResolver: CSharpUsingResolver;
  private nsMapper: CSharpNamespaceMapper;
  private projectMapper: CSharpProjectMapper;

  /**
   * Constructs a new CSharpDependencyFormatter.
   * @param files - A map of file paths to their corresponding syntax nodes.
   */
  constructor(
    parsedFiles: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    csprojFiles: Map<string, { path: string; content: string }>,
  ) {
    this.nsMapper = new CSharpNamespaceMapper(parsedFiles);
    this.projectMapper = new CSharpProjectMapper(csprojFiles);
    this.invResolver = new CSharpInvocationResolver(
      this.nsMapper,
      this.projectMapper,
    );
    this.usingResolver = new CSharpUsingResolver(
      this.nsMapper,
      this.projectMapper,
    );
    for (const [fp] of parsedFiles) {
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
      const fullname =
        (symbol.namespace !== "" ? symbol.namespace + "." : "") + symbol.name;
      const dependencies = this.invResolver.getInvocationsFromNode(
        symbol.node,
        symbol.filepath,
      );
      dependencies.resolvedSymbols = dependencies.resolvedSymbols.filter(
        (sm) => sm.name !== symbol.name,
      );
      symbols[fullname] = {
        id: fullname,
        type: symbol.type,
        lineCount: symbol.node.endPosition.row - symbol.node.startPosition.row,
        characterCount: symbol.node.endIndex - symbol.node.startIndex,
        dependencies: this.formatDependencies(dependencies),
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
      const filepath = resolvedSymbol.filepath;
      const id =
        namespace !== ""
          ? namespace + "." + resolvedSymbol.name
          : resolvedSymbol.name;
      if (!dependencies[filepath]) {
        dependencies[filepath] = {
          id: filepath,
          isExternal: false,
          symbols: {},
          isNamespace: true,
        };
      }
      dependencies[filepath].symbols[id] = id;
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

  /**
   * Formats external usings into a record of CSharpDependency.
   * @param resolvedimports - The resolved imports to format.
   * @returns A record of dependency IDs to their corresponding CSharpDependency.
   */
  private formatExternalUsings(
    resolvedimports: ResolvedImports,
  ): Record<string, CSharpDependency> {
    const dependencies: Record<string, CSharpDependency> = {};
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
    const globalUsings = this.formatExternalUsings(
      this.usingResolver.getGlobalUsings(filepath),
    );
    for (const key in globalUsings) {
      if (!formattedFile.dependencies[key]) {
        formattedFile.dependencies[key] = globalUsings[key];
      }
    }
    // Add local usings to dependencies
    const localUsings = this.formatExternalUsings(
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
