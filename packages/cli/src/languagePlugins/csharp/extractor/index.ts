import Parser from "tree-sitter";
import { CSharpProjectMapper } from "../projectMapper";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import { DependencyManifest } from "../../../manifest/dependencyManifest";

export class CSharpExtractor {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private manifest: DependencyManifest;
  private projectMapper: CSharpProjectMapper;
  private nsMapper: CSharpNamespaceMapper;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    manifest: DependencyManifest,
  ) {
    this.files = files;
    this.manifest = manifest;
    this.projectMapper = new CSharpProjectMapper(files);
    this.nsMapper = new CSharpNamespaceMapper(files);
  }

  /**
   * Finds all dependencies of a given symbol.
   * @param symbol - The symbol for which to find dependencies.
   * @returns An array of symbols.
   */
  private findDependencies(symbol: SymbolNode): SymbolNode[] {
    const dependencies: SymbolNode[] = [];
    const symbolDependencies = this.manifest[symbol.filepath]?.dependencies;
    if (symbolDependencies) {
      for (const dependency of Object.values(symbolDependencies)) {
        for (const depsymbol of Object.values(dependency.symbols)) {
          const depsymbolnode = this.nsMapper.findClassInTree(
            this.nsMapper.nsTree,
            depsymbol,
          );
          if (depsymbolnode) {
            dependencies.push(depsymbolnode);
          }
        }
      }
    }
    return dependencies;
  }

  /**
   * Finds all dependencies of a given symbol, and the dependencies of those dependencies.
   * @param symbol - The symbol for which to find dependencies.
   * @returns An array of symbols.
   */
  private findAllDependencies(
    symbol: SymbolNode,
    visited: Set<SymbolNode> = new Set<SymbolNode>(),
  ): SymbolNode[] {
    const allDependencies: SymbolNode[] = [];
    if (visited.has(symbol)) {
      return allDependencies;
    }
    visited.add(symbol);
    const dependencies = this.findDependencies(symbol);
    for (const dependency of dependencies) {
      allDependencies.push(dependency);
      allDependencies.push(...this.findAllDependencies(dependency, visited));
    }
    return allDependencies;
  }
}
