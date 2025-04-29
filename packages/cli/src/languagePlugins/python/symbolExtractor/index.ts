import Parser from "tree-sitter";
import { PythonExportExtractor } from "../exportExtractor/index.js";
import { PythonModuleResolver } from "../moduleResolver/index.js";
import { PythonItemResolver } from "../itemResolver/index.js";
import { PythonImportExtractor } from "../importExtractor/index.js";
import { PythonUsageResolver } from "../usageResolver/index.js";
import { DependencyManifest } from "@nanoapi.io/shared";
import { removeIndexesFromSourceCode } from "../../../helpers/sourceCode/index.js";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "../importExtractor/types.js";

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
  private processedSymbols: Set<string> = new Set<string>();

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

    let totalSymbols = 0;
    for (const { symbols } of symbolsToKeep.values()) {
      totalSymbols += symbols.size;
    }
    console.info(
      `Found ${totalSymbols} symbols to keep across ${symbolsToKeep.size} files`,
    );

    // 2. Extract all the symbols
    console.info(`Extracting files in-memory...`);
    const extractedFiles = this.extractFilesInMemory(symbolsToKeep);

    // 3. Clean error nodes
    console.info("Cleaning error nodes from files...");
    this.cleanErrorNodes(extractedFiles);

    // 4. Remove invalid imports.
    console.info("Removing invalid imports...");
    this.cleanImports(extractedFiles);

    // 5. Clean error nodes
    console.info("Cleaning error nodes from files...");
    this.cleanErrorNodes(extractedFiles);

    console.info("Successfully extracted all symbols!");

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
    // Create a unique key for this symbol to track processing
    const symbolKey = `${filePath}:${symbolName}`;

    // If we've already processed this symbol, return to avoid circular dependency
    if (this.processedSymbols.has(symbolKey)) {
      return symbolsToKeep;
    }

    // Mark this symbol as being processed
    this.processedSymbols.add(symbolKey);

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

    return symbolsToKeep;
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
          for (const node of symbol.nodes) {
            indexesToRemove.push({
              startIndex: node.startIndex,
              endIndex: node.endIndex,
            });
          }
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
  ) {
    for (const [filePath, fileData] of extractedFiles.entries()) {
      let sourceCode = fileData.content;

      // Need to remove error nodes one at a time, as fixing one error
      // might make previously invalid code valid
      while (true) {
        // Parse the file content
        const tree = this.parser.parse(sourceCode);

        // Find error nodes
        const captures = this.errorNodeQuery.captures(tree.rootNode);

        if (captures.length === 0) {
          break;
        }

        const firstCapture = captures[0];

        sourceCode =
          sourceCode.substring(0, firstCapture.node.startIndex) +
          sourceCode.substring(firstCapture.node.endIndex);
      }

      extractedFiles.set(filePath, {
        path: filePath,
        content: sourceCode,
      });
    }
  }

  /**
   * Removes invalid imports from the extracted files
   * Invalid imports are those that used to resolve to internal symbols or modules
   * but no longer do after extraction.
   */
  private cleanImports(
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

    const extractedFilesExportExtractor = new PythonExportExtractor(
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
      extractedFilesExportExtractor,
      extractedFilesImportExtractor,
      extractedFilesModuleResolver,
    );
    const extractedFilesUsageResolver = new PythonUsageResolver(
      this.parser,
      extractedFilesExportExtractor,
    );

    for (const { path, content } of extractedFiles.values()) {
      const originalFile = this.originalFiles.get(path);
      const extractedFile = extractedParsedFiles.get(path);

      // Get all imports in the file
      const originalImportStatements = this.importExtractor.getImportStatements(
        originalFile.path,
      );
      const extractedFilesImportStatements =
        extractedFilesImportExtractor.getImportStatements(extractedFile.path);

      const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

      // Check each import statement to see if it's still valid
      for (const extractedFilesImportStatement of extractedFilesImportStatements) {
        if (
          extractedFilesImportStatement.type === NORMAL_IMPORT_STATEMENT_TYPE
        ) {
          const indexesToRemoveForImport: {
            startIndex: number;
            endIndex: number;
          }[] = [];
          // Handle normal imports (import foo, import foo.bar)
          for (const member of extractedFilesImportStatement.members) {
            // resolve the module from the original file
            const originalFileModule =
              this.moduleResolver.getModuleFromFilePath(originalFile.path);
            const resolvedOriginalModule = this.moduleResolver.resolveModule(
              originalFileModule,
              member.identifierNode.text,
            );

            if (!resolvedOriginalModule) {
              // If the module doesn't resolve, it's an external module

              // Check if the import is used in original code
              const originalUsageNode = this.usageResolver.getUsageNode(
                originalFile.rootNode,
                originalImportStatements.map((s) => s.node),
                member.aliasNode?.text || member.identifierNode.text,
              );

              // Check if the import is used in extracted code
              const extractedUsageNode =
                extractedFilesUsageResolver.getUsageNode(
                  extractedFile.rootNode,
                  extractedFilesImportStatements.map((s) => s.node),
                  member.aliasNode?.text || member.identifierNode.text,
                );

              // If the import was used in original code but not in extracted code, remove it
              if (
                originalUsageNode.length > 0 &&
                extractedUsageNode.length === 0
              ) {
                const startIndex = member.node.startIndex;
                let endIndex = member.node.endIndex;
                if (
                  member.node.nextSibling &&
                  member.node.nextSibling.type === ","
                ) {
                  endIndex = member.node.nextSibling.endIndex;
                }
                indexesToRemoveForImport.push({
                  startIndex,
                  endIndex,
                });
              }
              continue;
            }

            // resolve the module from the extracted file
            const extractedFileModule =
              extractedFilesModuleResolver.getModuleFromFilePath(
                extractedFile.path,
              );
            const resolvedExtractedFileModule =
              extractedFilesModuleResolver.resolveModule(
                extractedFileModule,
                member.identifierNode.text,
              );

            if (!resolvedExtractedFileModule) {
              // the module does not resolve anymore, we remove it
              const startIndex = member.node.startIndex;
              let endIndex = member.node.endIndex;
              if (
                member.node.nextSibling &&
                member.node.nextSibling.type === ","
              ) {
                endIndex = member.node.nextSibling.endIndex;
              }
              indexesToRemoveForImport.push({
                startIndex,
                endIndex,
              });
              continue;
            }

            // check if used become unused. if so, we should remove it
            const originalUsageNode = this.usageResolver.getUsageNode(
              originalFile.rootNode,
              originalImportStatements.map((s) => s.node),
              member.aliasNode?.text || member.identifierNode.text,
            );
            const extractedUsageNode = extractedFilesUsageResolver.getUsageNode(
              extractedFile.rootNode,
              extractedFilesImportStatements.map((s) => s.node),
              member.aliasNode?.text || member.identifierNode.text,
            );

            if (
              originalUsageNode.length > 0 &&
              extractedUsageNode.length === 0
            ) {
              // the import was used in original code but not in extracted code, we remove it
              const startIndex = member.node.startIndex;
              let endIndex = member.node.endIndex;
              if (
                member.node.nextSibling &&
                member.node.nextSibling.type === ","
              ) {
                endIndex = member.node.nextSibling.endIndex;
              }
              indexesToRemoveForImport.push({
                startIndex,
                endIndex,
              });
            }
          }

          if (indexesToRemoveForImport.length > 0) {
            if (
              indexesToRemoveForImport.length ===
              extractedFilesImportStatement.members.length
            ) {
              // remove the whole import
              indexesToRemove.push({
                startIndex: extractedFilesImportStatement.node.startIndex,
                endIndex: extractedFilesImportStatement.node.endIndex,
              });
            } else {
              // remove the members that are not kept
              indexesToRemove.push(...indexesToRemoveForImport);
            }
          }
        } else if (
          extractedFilesImportStatement.type === FROM_IMPORT_STATEMENT_TYPE
        ) {
          // Handle from imports (from foo import bar)
          const member = extractedFilesImportStatement.members[0];

          const originalFileModule = this.moduleResolver.getModuleFromFilePath(
            originalFile.path,
          );
          const resolvedOriginalModule = this.moduleResolver.resolveModule(
            originalFileModule,
            member.identifierNode.text,
          );

          // If the module doesn't resolve in the original files, it's external
          if (!resolvedOriginalModule) {
            if (member.isWildcardImport) {
              // if wildcard, we skip it, no way to check if it's used or not
              continue;
            }

            // Check each item in the import if used or not
            if (!member.items) {
              throw new Error(
                `Could not find items for import ${member.identifierNode.text} in ${originalFile.path}`,
              );
            }

            const indexesToRemoveForImport: {
              startIndex: number;
              endIndex: number;
            }[] = [];

            for (const item of member.items) {
              // Check if the imported item is used in original code
              const originalUsageNode = this.usageResolver.getUsageNode(
                originalFile.rootNode,
                originalImportStatements.map((s) => s.node),
                item.aliasNode?.text || item.identifierNode.text,
              );

              // Check if the imported item is used in extracted code
              const extractedUsageNode =
                extractedFilesUsageResolver.getUsageNode(
                  extractedFile.rootNode,
                  extractedFilesImportStatements.map((s) => s.node),
                  item.aliasNode?.text || item.identifierNode.text,
                );

              // If the item was used in original code but not in extracted code, remove it
              if (
                originalUsageNode.length > 0 &&
                extractedUsageNode.length === 0
              ) {
                const startIndex = item.node.startIndex;
                let endIndex = item.node.endIndex;
                if (
                  item.node.nextSibling &&
                  item.node.nextSibling.type === ","
                ) {
                  endIndex = item.node.nextSibling.endIndex;
                }
                indexesToRemoveForImport.push({
                  startIndex,
                  endIndex,
                });
              }
            }

            if (indexesToRemoveForImport.length > 0) {
              if (indexesToRemoveForImport.length === member.items.length) {
                // remove the whole import
                indexesToRemove.push({
                  startIndex: extractedFilesImportStatement.node.startIndex,
                  endIndex: extractedFilesImportStatement.node.endIndex,
                });
              } else {
                // remove the items that are not kept
                indexesToRemove.push(...indexesToRemoveForImport);
              }
            }
            continue;
          }

          // Check if the module can be resolved in the extracted files
          const extractedFileModule =
            extractedFilesModuleResolver.getModuleFromFilePath(
              extractedFile.path,
            );
          const resolvedExtractedModule =
            extractedFilesModuleResolver.resolveModule(
              extractedFileModule,
              member.identifierNode.text,
            );

          // If the module doesn't resolve anymore, remove the entire import
          if (!resolvedExtractedModule) {
            indexesToRemove.push({
              startIndex: extractedFilesImportStatement.node.startIndex,
              endIndex: extractedFilesImportStatement.node.endIndex,
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
              `Could not find items for import ${member.identifierNode.text} in ${originalFile.path}`,
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

              // Check if the imported item is used in original code
              const originalUsageNode = this.usageResolver.getUsageNode(
                originalFile.rootNode,
                originalImportStatements.map((s) => s.node),
                item.aliasNode?.text || item.identifierNode.text,
              );

              // Check if the imported item is used in extracted code
              const extractedUsageNode =
                extractedFilesUsageResolver.getUsageNode(
                  extractedFile.rootNode,
                  extractedFilesImportStatements.map((s) => s.node),
                  item.aliasNode?.text || item.identifierNode.text,
                );

              // If the item was used in original code but not in extracted code, remove it
              if (
                originalUsageNode.length > 0 &&
                extractedUsageNode.length === 0
              ) {
                const startIndex = item.node.startIndex;
                let endIndex = item.node.endIndex;
                if (
                  item.node.nextSibling &&
                  item.node.nextSibling.type === ","
                ) {
                  endIndex = item.node.nextSibling.endIndex;
                }
                indexesToRemoveForImport.push({
                  startIndex,
                  endIndex,
                });
              }
              continue;
            }

            const extractedItem = extractedFilesItemResolver.resolveItem(
              resolvedExtractedModule,
              item.identifierNode.text,
            );

            if (!extractedItem) {
              // if the item doesn't resolve we need to remove it
              const startIndex = item.node.startIndex;
              let endIndex = item.node.endIndex;
              if (item.node.nextSibling && item.node.nextSibling.type === ",") {
                endIndex = item.node.nextSibling.endIndex;
              }
              indexesToRemoveForImport.push({
                startIndex,
                endIndex,
              });
              continue;
            }

            // Check if the imported item is used in original code
            const originalUsageNode = this.usageResolver.getUsageNode(
              originalFile.rootNode,
              originalImportStatements.map((s) => s.node),
              item.aliasNode?.text || item.identifierNode.text,
            );

            // Check if the imported item is used in extracted code
            const extractedUsageNode = extractedFilesUsageResolver.getUsageNode(
              extractedFile.rootNode,
              extractedFilesImportStatements.map((s) => s.node),
              item.aliasNode?.text || item.identifierNode.text,
            );

            // If the item was used in original code but not in extracted code, remove it
            if (
              originalUsageNode.length > 0 &&
              extractedUsageNode.length === 0
            ) {
              const startIndex = item.node.startIndex;
              let endIndex = item.node.endIndex;
              if (item.node.nextSibling && item.node.nextSibling.type === ",") {
                endIndex = item.node.nextSibling.endIndex;
              }
              indexesToRemoveForImport.push({
                startIndex,
                endIndex,
              });
            }
          }

          if (indexesToRemoveForImport.length > 0) {
            if (indexesToRemoveForImport.length === member.items.length) {
              // remove the whole import
              indexesToRemove.push({
                startIndex: extractedFilesImportStatement.node.startIndex,
                endIndex: extractedFilesImportStatement.node.endIndex,
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
