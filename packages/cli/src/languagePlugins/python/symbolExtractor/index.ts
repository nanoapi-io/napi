import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";
import { PythonImportExtractor } from "../importExtractor";
import { PythonUsageResolver } from "../usageResolver";
import { DependencyManifest } from "../../../manifest/dependencyManifest/types";
import { removeIndexesFromSourceCode } from "../../../helpers/sourceCode";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "../importExtractor/types";

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
    // 1. Identify symbols to keep and their dependencies recursively
    console.info("Finding dependencies for all symbols to extract...");
    const symbolsToKeep = this.identifySymbolsAndDependencies(symbolsMap);

    // 2. Extract all the symbols
    console.info(`Extracting files in-memory...`);
    const extractedFiles = this.extractFilesInMemory(symbolsToKeep);

    // 3. Clean error nodes
    console.info("Cleaning error nodes from files...");
    this.cleanErrorNodes(extractedFiles);

    // 4. Remove invalid imports.
    console.info("Removing invalid imports...");
    this.removeInvalidImports(extractedFiles);

    // 5. Clean error nodes
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

  /**
   * Removes invalid imports from the extracted files
   * Invalid imports are those that used to resolve to internal symbols or modules
   * but no longer do after extraction.
   */
  private removeInvalidImports(
    extractedFiles: Map<string, { path: string; content: string }>,
  ) {
    const extractedParsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    for (const { path, content } of extractedFiles.values()) {
      const tree = this.parser.parse(content, undefined, {
        bufferSize: content.length + 10,
      });
      extractedParsedFiles.set(path, { path, rootNode: tree.rootNode });
    }

    const extractedExportExtractor = new PythonExportExtractor(
      this.parser,
      extractedParsedFiles,
    );
    const extractedFilesImportExtractor = new PythonImportExtractor(
      this.parser,
      extractedParsedFiles,
    );
    const extractedFilesModuleResolver = new PythonModuleResolver(
      new Set(extractedParsedFiles.keys()),
      this.moduleResolver.pythonVersion,
    );
    const extractedFilesItemResolver = new PythonItemResolver(
      extractedExportExtractor,
      extractedFilesImportExtractor,
      extractedFilesModuleResolver,
    );

    for (const { path, content } of extractedFiles.values()) {
      // Get all imports in the file
      const importStatements = this.importExtractor.getImportStatements(path);

      const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

      // Check each import statement to see if it's still valid
      for (const importStatement of importStatements) {
        if (importStatement.type === NORMAL_IMPORT_STATEMENT_TYPE) {
          const indexesToRemoveForImport: {
            startIndex: number;
            endIndex: number;
          }[] = [];
          // Handle normal imports (import foo, import foo.bar)
          for (const member of importStatement.members) {
            // resolve the module from the original file
            const originalFileModule =
              this.moduleResolver.getModuleFromFilePath(path);
            const resolvedOriginalModule = this.moduleResolver.resolveModule(
              originalFileModule,
              member.identifierNode.text,
            );

            if (!resolvedOriginalModule) {
              // If the module doesn't resolve, it's an external module
              // and we don't need to remove it
              continue;
            }

            // resolve the module from the extracted file
            const extractedFileModule =
              extractedFilesModuleResolver.getModuleFromFilePath(path);
            const resolvedExtractedFileModule =
              extractedFilesModuleResolver.resolveModule(
                extractedFileModule,
                member.identifierNode.text,
              );

            if (!resolvedExtractedFileModule) {
              // the module does not resolve anymore, we remove it
              indexesToRemoveForImport.push({
                startIndex: importStatement.node.startIndex,
                endIndex: importStatement.node.endIndex,
              });
              continue;
            }
          }

          if (indexesToRemoveForImport.length > 0) {
            if (
              indexesToRemoveForImport.length === importStatement.members.length
            ) {
              // remove the whole import
              indexesToRemove.push({
                startIndex: importStatement.node.startIndex,
                endIndex: importStatement.node.endIndex,
              });
            } else {
              // remove the members that are not kept
              indexesToRemove.push(...indexesToRemoveForImport);
            }
          }
        } else if (importStatement.type === FROM_IMPORT_STATEMENT_TYPE) {
          // Handle from imports (from foo import bar)
          const member = importStatement.members[0];

          const originalFileModule =
            this.moduleResolver.getModuleFromFilePath(path);
          const resolvedOriginalModule = this.moduleResolver.resolveModule(
            originalFileModule,
            member.identifierNode.text,
          );

          // If the module doesn't resolve in the original files, it's external - keep it
          if (!resolvedOriginalModule) {
            continue;
          }

          // Check if the module can be resolved in the extracted files
          const extractedFileModule =
            extractedFilesModuleResolver.getModuleFromFilePath(path);
          const resolvedExtractedModule =
            extractedFilesModuleResolver.resolveModule(
              extractedFileModule,
              member.identifierNode.text,
            );

          // If the module doesn't resolve anymore, remove the entire import
          if (!resolvedExtractedModule) {
            indexesToRemove.push({
              startIndex: importStatement.node.startIndex,
              endIndex: importStatement.node.endIndex,
            });
            continue;
          }

          // if the module resolve we need to check each item in the import
          if (member.isWildcardImport) {
            // if wildcard, we skip it
            continue;
          }

          // if the member is not a wildcard, we need to check if each items
          const indexesToRemoveForImport: {
            startIndex: number;
            endIndex: number;
          }[] = [];

          if (!member.items) {
            throw new Error(
              `Could not find items for import ${member.identifierNode.text} in ${path}`,
            );
          }

          for (const item of member.items) {
            // resolve the item from the original file
            const originalItem = this.itemResolver.resolveItem(
              resolvedOriginalModule,
              item.identifierNode.text,
            );

            if (!originalItem) {
              // if the item doesn't resolve in the original file, it's external - keep it
              continue;
            }

            const extractedItem = extractedFilesItemResolver.resolveItem(
              resolvedExtractedModule,
              item.identifierNode.text,
            );

            if (!extractedItem) {
              // if the item doesn't resolve we need to remove it
              indexesToRemoveForImport.push({
                startIndex: importStatement.node.startIndex,
                endIndex: importStatement.node.endIndex,
              });
            }
          }

          if (indexesToRemoveForImport.length > 0) {
            if (indexesToRemoveForImport.length === member.items.length) {
              // remove the whole import
              indexesToRemove.push({
                startIndex: importStatement.node.startIndex,
                endIndex: importStatement.node.endIndex,
              });
            } else {
              // remove the items that are not kept
              indexesToRemove.push(...indexesToRemoveForImport);
            }
          }
        }
      }

      // Remove the invalid imports from the file content
      if (indexesToRemove.length > 0) {
        const newContent = removeIndexesFromSourceCode(
          content,
          indexesToRemove,
        );
        // Update the file in the map
        extractedFiles.set(path, { path, content: newContent });
      }
    }
  }
}
