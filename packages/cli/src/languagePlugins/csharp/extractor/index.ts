import type Parser from "npm:tree-sitter";
import {
  CSharpProjectMapper,
  type DotNetProject,
} from "../projectMapper/index.ts";
import {
  CSharpNamespaceMapper,
  type SymbolNode,
} from "../namespaceMapper/index.ts";
import {
  CSharpUsingResolver,
  type UsingDirective,
} from "../usingResolver/index.ts";
import type { DependencyManifest } from "@napi/shared";
import { csharpParser } from "../../../helpers/treeSitter/parsers.ts";

/**
 * Represents an extracted file containing a symbol.
 */
export interface ExtractedFile {
  /** The subproject to which the file belongs */
  subproject: DotNetProject;
  /** The namespace of the symbol */
  namespace: string;
  /** The symbol node */
  symbol: SymbolNode;
  /** The using directives in the file */
  imports: UsingDirective[];
  /** The name of the file */
  name: string;
}

export class CSharpExtractor {
  private manifest: DependencyManifest;
  public projectMapper: CSharpProjectMapper;
  private nsMapper: CSharpNamespaceMapper;
  public usingResolver: CSharpUsingResolver;

  constructor(
    files: Map<string, { path: string; content: string }>,
    manifest: DependencyManifest,
  ) {
    this.manifest = manifest;
    const csprojFiles = new Map<string, { path: string; content: string }>();
    const parsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    for (const [filePath, file] of files) {
      if (filePath.endsWith(".csproj")) {
        csprojFiles.set(filePath, file);
      } else if (filePath.endsWith(".cs")) {
        parsedFiles.set(filePath, {
          path: filePath,
          rootNode: csharpParser.parse(file.content).rootNode,
        });
      }
    }
    this.projectMapper = new CSharpProjectMapper(csprojFiles);
    this.nsMapper = new CSharpNamespaceMapper(parsedFiles);
    this.usingResolver = new CSharpUsingResolver(
      this.nsMapper,
      this.projectMapper,
    );
    for (const [filePath] of parsedFiles) {
      this.usingResolver.resolveUsingDirectives(filePath);
    }
  }

  /**
   * Finds all dependencies of a given symbol.
   * @param symbol - The symbol for which to find dependencies.
   * @returns An array of symbols.
   */
  private findDependencies(symbol: SymbolNode): SymbolNode[] {
    const dependencies: SymbolNode[] = [];
    const symbolfullname = symbol.namespace !== ""
      ? symbol.namespace + "." + symbol.name
      : symbol.name;
    const symbolDependencies = this.manifest[symbol.filepath]
      ?.symbols[symbolfullname].dependencies;
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
    const allDependencies: Set<SymbolNode> = new Set<SymbolNode>();
    if (visited.has(symbol)) {
      return Array.from(allDependencies);
    }
    visited.add(symbol);
    const dependencies = this.findDependencies(symbol);
    for (const dependency of dependencies) {
      allDependencies.add(dependency);
      for (const dep of this.findAllDependencies(dependency, visited)) {
        allDependencies.add(dep);
      }
    }
    return Array.from(allDependencies);
  }

  /**
   * Saves the extracted file containing a symbol into the filesystem.
   * @param file - The extracted file to save.
   */
  public getContent(file: ExtractedFile): string {
    const usingDirectives = file.imports
      .map((directive) => directive.node.text)
      .join("\n");
    const namespaceDirective = file.namespace !== ""
      ? `namespace ${file.namespace};`
      : "";
    const content =
      `${usingDirectives}\n${namespaceDirective}\n${file.symbol.node.text}\n`;
    return content;
  }

  /**
   * Extracts a given symbol and its dependencies and returns them as files.
   * @param symbol - The symbol to extract.
   * @returns An array of extracted files.
   */
  public extractSymbol(symbol: SymbolNode): ExtractedFile[] {
    const subproject = this.projectMapper.findSubprojectForFile(
      symbol.filepath,
    );
    if (!subproject) {
      throw new Error(`Subproject not found for file: ${symbol.filepath}`);
    }
    const extractedFiles: ExtractedFile[] = [];
    const visitedSymbols = new Set<string>();

    const addExtractedFile = (symbol: SymbolNode) => {
      // If the symbol is nested, we export the parent.
      while (symbol.parent) {
        symbol = symbol.parent;
      }
      if (!visitedSymbols.has(symbol.name)) {
        visitedSymbols.add(symbol.name);
        const subproject = this.projectMapper.findSubprojectForFile(
          symbol.filepath,
        );
        if (subproject) {
          const extractedFile: ExtractedFile = {
            subproject,
            namespace: symbol.namespace,
            symbol,
            imports: this.usingResolver.parseUsingDirectives(symbol.filepath),
            name: symbol.name,
          };
          extractedFiles.push(extractedFile);
        }
      }
    };

    addExtractedFile(symbol);
    const dependencies = this.findAllDependencies(symbol);
    for (const dependency of dependencies) {
      addExtractedFile(dependency);
    }

    return extractedFiles;
  }

  /**
   * Extracts a symbol from a file by its name.
   * @param filePath - The path to file that contains the symbol to extract
   * @param symbolName - The name of the symbol to extract
   * @returns A list of extracted files or undefined if the symbol is not found
   */
  public extractSymbolFromFile(
    filePath: string,
    symbolName: string,
  ): ExtractedFile[] | undefined {
    const fileExports = this.nsMapper.getFileExports(filePath);
    const symbol = fileExports.find(
      (symbol) =>
        symbol.name === symbolName ||
        symbol.namespace + "." + symbol.name === symbolName,
    );
    if (symbol) {
      return this.extractSymbol(symbol);
    }
    return undefined;
  }

  public generateGlobalUsings(subproject: DotNetProject): string {
    let content = "";
    const directives = subproject.globalUsings.directives;
    for (const directive of directives) {
      content += `${directive.node.text}\n`;
    }
    return content;
  }
}
