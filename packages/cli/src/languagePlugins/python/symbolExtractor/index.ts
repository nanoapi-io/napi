import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";
import { PythonImportExtractor } from "../importExtractor";
import { PythonUsageResolver } from "../usageResolver";
import { DependencyManifest } from "../../../manifest/dependencyManifest";
import { removeIndexesFromSourceCode } from "../../../helpers/sourceCode";

/**
 * Python Symbol Extractor
 *
 * This class extracts a Python symbol and all its dependencies from a project
 * while preserving the original project structure.
 */
export class PythonSymbolExtractor {
  private originalFiles: Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >;
  private parser: Parser;
  private exportExtractor: PythonExportExtractor;
  public importExtractor: PythonImportExtractor;
  public moduleResolver: PythonModuleResolver;
  public itemResolver: PythonItemResolver;
  public usageResolver: PythonUsageResolver;
  private dependencyManifest: DependencyManifest;
  private errorNodeQuery: Parser.Query;

  /**
   * Creates a new Python Symbol Extractor
   */
  constructor(
    parser: Parser,
    originalFiles: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportExtractor: PythonExportExtractor,
    importExtractor: PythonImportExtractor,
    moduleResolver: PythonModuleResolver,
    itemResolver: PythonItemResolver,
    usageResolver: PythonUsageResolver,
    dependencyManifest: DependencyManifest,
  ) {
    this.parser = parser;
    this.originalFiles = originalFiles;
    this.exportExtractor = exportExtractor;
    this.importExtractor = importExtractor;
    this.moduleResolver = moduleResolver;
    this.itemResolver = itemResolver;
    this.usageResolver = usageResolver;
    this.dependencyManifest = dependencyManifest;
    this.errorNodeQuery = new Parser.Query(
      this.parser.getLanguage(),
      "(ERROR) @error",
    );
  }

  /**
   * Extracts a symbol and all its dependencies from the project
   *
   * @param symbolsToExtract A list of symbols to extract
   * @returns Symbol extraction result
   */
  public extractSymbol(
    symbolsMap: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ) {
    // 2. Identify symbols to keep and their dependencies recursively
    console.info("Finding dependencies for all symbols to extract...");
    const symbolsToKeep = this.identifySymbolsAndDependencies(symbolsMap);

    // 3. Extract all the symbols
    console.info(`Extracting files in-memory...`);
    const extractedFiles = this.extractFilesInMemory(symbolsToKeep);

    // 4. Clean error nodes
    console.info("Cleaning error nodes from files...");
    this.cleanErrorNodes(extractedFiles);

    // Return the extracted files
    return extractedFiles;
  }

  /**
   * Identifies symbols and their dependencies to keep
   */
  private identifySymbolsAndDependencies(
    symbolsMap: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ) {
    const symbolsToKeep = new Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >();

    symbolsMap.values().forEach(({ filePath, symbols }) => {
      symbols.forEach((symbol) => {
        this.addSymbolAndDependencies(filePath, symbol, symbolsToKeep);
      });
    });

    return symbolsToKeep;
  }

  private addSymbolAndDependencies(
    filePath: string,
    symbolName: string,
    symbolsToKeep = new Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >(),
  ) {
    // Add the symbol itself to the filesToKeep map
    let fileToKeep = symbolsToKeep.get(filePath);
    if (!fileToKeep) {
      fileToKeep = {
        filePath,
        symbols: new Set(),
      };
    }
    fileToKeep.symbols.add(symbolName);
    symbolsToKeep.set(filePath, fileToKeep);

    const fileManifest = this.dependencyManifest[filePath];
    if (!fileManifest) {
      throw new Error(`Could not find dependency file for ${filePath}`);
    }

    const symbolManifest = fileManifest.symbols[symbolName];
    if (!symbolManifest) {
      throw new Error(`Could not find symbol manifest for ${symbolName}`);
    }

    for (const dependency of Object.values(symbolManifest.dependencies)) {
      // skip external dependencies
      if (dependency.isExternal) {
        continue;
      }

      // add the file to the filesToKeep map
      if (!symbolsToKeep.has(dependency.id)) {
        symbolsToKeep.set(dependency.id, {
          filePath: dependency.id,
          symbols: new Set(),
        });
      }
      let fileToKeep = symbolsToKeep.get(dependency.id);
      if (!fileToKeep) {
        fileToKeep = {
          filePath: dependency.id,
          symbols: new Set(),
        };
      }
      Object.values(dependency.symbols).forEach((depSymbol) => {
        // add the symbol and its dependencies to the filesToKeep map
        this.addSymbolAndDependencies(dependency.id, depSymbol, symbolsToKeep);
      });
    }
  }

  /**
   * Extracts files in memory
   */
  private extractFilesInMemory(
    symbolsToKeep: Map<
      string,
      {
        filePath: string;
        symbols: Set<string>;
      }
    >,
  ) {
    const extractedFiles = new Map<string, { path: string; content: string }>();

    // Process each file to keep
    for (const { filePath, symbols } of symbolsToKeep.values()) {
      // Get the file from originalFiles using the exact file path
      const file = this.originalFiles.get(filePath);
      if (!file) {
        throw new Error(`Could not find file ${filePath} for extraction`);
      }

      // Get the full file content
      const fileContent = file.rootNode.text;

      // Get exported symbols
      const exports = this.exportExtractor.getSymbols(filePath);

      const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

      for (const symbol of exports.symbols) {
        if (!symbols.has(symbol.id)) {
          const symbolNode = symbol.node;
          indexesToRemove.push({
            startIndex: symbolNode.startIndex,
            endIndex: symbolNode.endIndex,
          });
        }
      }

      const cleanedContent = removeIndexesFromSourceCode(
        fileContent,
        indexesToRemove,
      );

      // Add the cleaned content to our extracted files
      extractedFiles.set(filePath, {
        path: filePath,
        content: cleanedContent,
      });
    }

    return extractedFiles;
  }

  /**
   * Cleans error nodes from extracted files
   */
  private cleanErrorNodes(
    extractedFiles: Map<string, { path: string; content: string }>,
  ): void {
    for (const [filePath, fileData] of extractedFiles.entries()) {
      // Parse the file content
      const tree = this.parser.parse(fileData.content);

      // Find error nodes
      const matches = this.errorNodeQuery.matches(tree.rootNode);

      // If there are error nodes, clean them by removing the content
      if (matches.length > 0) {
        console.warn(
          `Found ${matches.length} error nodes in ${filePath}, cleaning...`,
        );

        // Sort matches by start position in descending order to avoid offset issues
        matches.sort((a, b) => {
          const nodeA = a.captures[0].node;
          const nodeB = b.captures[0].node;
          return nodeB.startIndex - nodeA.startIndex;
        });

        let cleanedContent = fileData.content;

        // Remove each error node
        for (const match of matches) {
          const errorNode = match.captures[0].node;
          cleanedContent =
            cleanedContent.substring(0, errorNode.startIndex) +
            cleanedContent.substring(errorNode.endIndex);
        }

        // Update the file content
        fileData.content = cleanedContent;
      }
    }
  }
}
