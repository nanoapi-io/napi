import Parser from "tree-sitter";
import { CSharpProjectMapper, DotNetProject } from "../projectMapper";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import { CSharpUsingResolver, UsingDirective } from "../usingResolver";
import { DependencyManifest } from "../../../manifest/dependencyManifest";
import fs from "fs";
import path from "path";

export interface ExtractedFile {
  subproject: DotNetProject;
  namespace: string;
  symbol: SymbolNode;
  imports: UsingDirective[];
  name: string;
}

export class CSharpExtractor {
  private manifest: DependencyManifest;
  private projectMapper: CSharpProjectMapper;
  private nsMapper: CSharpNamespaceMapper;
  private usingResolver: CSharpUsingResolver;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    manifest: DependencyManifest,
  ) {
    this.manifest = manifest;
    this.projectMapper = new CSharpProjectMapper(files);
    this.nsMapper = new CSharpNamespaceMapper(files);
    this.usingResolver = new CSharpUsingResolver(
      this.nsMapper,
      this.projectMapper,
    );
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

  /**
   * Saves the extracted file containing a symbol into the filesystem.
   * @param file - The extracted file to save.
   */
  private saveFile(file: ExtractedFile) {
    const subproject = file.subproject;
    const csprojpath = subproject.csprojPath;
    const projname = path.basename(csprojpath, path.extname(csprojpath));
    const outputpath = path.join(subproject.rootFolder, ".extracted", projname);
    const srcpath = path.join(outputpath, "src");
    if (!fs.existsSync(outputpath)) {
      fs.mkdirSync(outputpath, { recursive: true });
      fs.mkdirSync(srcpath);
    }
    const destinationPath = path.join(outputpath, `${projname}.csproj`);
    fs.copyFileSync(csprojpath, destinationPath);
    const outputPath = path.join(srcpath, `${file.name}.cs`);
    const usingDirectives = file.imports
      .map((directive) => directive.node.text)
      .join("\n");
    const namespaceDirective =
      file.namespace !== "" ? `namespace ${file.namespace};` : "";
    const content = `${usingDirectives}\n${namespaceDirective}\n${file.symbol.node.text}\n`;
    fs.writeFileSync(outputPath, content);
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
    const extractedFiles: ExtractedFile[] = [
      {
        subproject,
        namespace: symbol.namespace,
        symbol,
        imports: this.usingResolver.parseUsingDirectives(symbol.filepath),
        name: symbol.name,
      },
    ];
    const dependencies = this.findAllDependencies(symbol);
    for (const dependency of dependencies) {
      const filePath = dependency.filepath;
      const subproject = this.projectMapper.findSubprojectForFile(filePath);
      if (subproject) {
        const namespace = dependency.namespace;
        const extractedFile: ExtractedFile = {
          subproject,
          namespace,
          symbol: dependency,
          imports: this.usingResolver.parseUsingDirectives(filePath),
          name: dependency.name,
        };
        extractedFiles.push(extractedFile);
      }
    }
    return extractedFiles;
  }

  /**
   * Extracts a symbol and saves it to the filesystem.
   * @param symbol - The symbol to extract and save.
   */
  public extractAndSaveSymbol(symbol: SymbolNode): void {
    const extractedFiles = this.extractSymbol(symbol);
    for (const file of extractedFiles) {
      this.saveFile(file);
    }
  }

  /**
   * Extract a symbol using its name and saves it to the filesystem.
   * @param symbolName - The name of the symbol to extract and save.
   */
  public extractAndSaveSymbolByName(symbolName: string): void {
    const symbol = this.nsMapper.findClassInTree(
      this.nsMapper.nsTree,
      symbolName,
    );
    if (symbol) {
      this.extractAndSaveSymbol(symbol);
    } else {
      console.error(`Symbol ${symbolName} not found.`);
    }
  }
}
