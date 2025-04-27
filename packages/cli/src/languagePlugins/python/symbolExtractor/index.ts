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
import { InternalUsage } from "../usageResolver/types.js";

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
    this.removeInvalidImports(extractedFiles);

    // 5. Clean error nodes
    console.info("Cleaning error nodes from files...");
    this.cleanErrorNodes(extractedFiles);

    // 6. Remove unused imports
    console.info("Removing unused imports...");
    this.removeUnusedImports(extractedFiles);

    // 7. Clean error nodes
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
              const startIndex = importStatement.node.startIndex;
              let endIndex = importStatement.node.endIndex;
              if (
                importStatement.node.nextSibling &&
                importStatement.node.nextSibling.type === ","
              ) {
                endIndex = importStatement.node.nextSibling.endIndex;
              }
              indexesToRemoveForImport.push({
                startIndex,
                endIndex,
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

  /**
   * Removes unused imports from the extracted files
   * Unused imports are those that used to be used in the original files
   * but are not used in the extracted files
   */
  private removeUnusedImports(
    extractedFiles: Map<string, { path: string; content: string }>,
  ) {
    const extractedParsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();

    // Parse all extracted files
    for (const { path, content } of extractedFiles.values()) {
      const tree = this.parser.parse(content, undefined, {
        bufferSize: content.length + 10,
      });
      extractedParsedFiles.set(path, { path, rootNode: tree.rootNode });
    }

    // Create new instances of needed extractors/resolvers for the extracted files
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

    // Create a usage resolver for the extracted files to detect import usage
    const extractedFilesUsageResolver = new PythonUsageResolver(
      this.parser,
      extractedExportExtractor,
    );

    // Process each file to remove unused imports
    for (const { path, content } of extractedFiles.values()) {
      // Get all import statements in the file
      const importStatements =
        extractedFilesImportExtractor.getImportStatements(path);

      // Skip if no imports found
      if (importStatements.length === 0) {
        continue;
      }

      // Get the file's root node for analysis
      const fileData = extractedParsedFiles.get(path);
      if (!fileData) {
        throw new Error(`Could not find parsed file data for ${path}`);
      }

      // Find nodes to exclude from usage analysis (typically the import statements themselves)
      const nodesToExclude = importStatements.map(
        (statement) => statement.node,
      );

      // Maps to track what's actually used
      const internalUsageMap = new Map<string, InternalUsage>();
      const externalUsageMap = new Map<
        string,
        {
          moduleName: string;
          itemNames: Set<string>;
        }
      >();

      // Track indexes of unused imports to remove
      const indexesToRemove: { startIndex: number; endIndex: number }[] = [];

      // Check each import statement to see if it's used
      for (const importStatement of importStatements) {
        if (importStatement.type === NORMAL_IMPORT_STATEMENT_TYPE) {
          // Handle normal imports (import foo, import foo.bar)
          const indexesToRemoveForImport: {
            startIndex: number;
            endIndex: number;
          }[] = [];

          for (const member of importStatement.members) {
            const importName = member.identifierNode.text;
            const lookupRef = member.aliasNode?.text || importName;

            // Try to resolve as internal module first
            const fileModule =
              extractedFilesModuleResolver.getModuleFromFilePath(path);
            const resolvedModule = extractedFilesModuleResolver.resolveModule(
              fileModule,
              importName,
            );

            if (resolvedModule) {
              // It's an internal module, check if it's used
              extractedFilesUsageResolver.resolveInternalUsageForModule(
                fileData.rootNode,
                nodesToExclude,
                resolvedModule,
                lookupRef,
                internalUsageMap,
              );

              // If no usage found, mark for removal
              if (!internalUsageMap.has(resolvedModule.path)) {
                // This member is unused, mark it for removal
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
            } else {
              // It's an external module, check if it's used
              extractedFilesUsageResolver.resolveExternalUsageForItem(
                fileData.rootNode,
                nodesToExclude,
                { moduleName: importName },
                lookupRef,
                externalUsageMap,
              );

              // If no usage found, mark for removal
              if (!externalUsageMap.has(importName)) {
                // This member is unused, mark it for removal
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
          }

          // Handle removals for normal imports
          if (indexesToRemoveForImport.length > 0) {
            if (
              indexesToRemoveForImport.length === importStatement.members.length
            ) {
              // Remove the whole import statement if all members are unused
              indexesToRemove.push({
                startIndex: importStatement.node.startIndex,
                endIndex: importStatement.node.endIndex,
              });
            } else {
              // Remove only the unused members
              indexesToRemove.push(...indexesToRemoveForImport);
            }
          }
        } else if (importStatement.type === FROM_IMPORT_STATEMENT_TYPE) {
          // Handle from imports (from foo import bar)
          const member = importStatement.members[0];
          const moduleName = member.identifierNode.text;
          const fileModule =
            extractedFilesModuleResolver.getModuleFromFilePath(path);
          const resolvedModule = extractedFilesModuleResolver.resolveModule(
            fileModule,
            moduleName,
          );

          if (resolvedModule) {
            // It's an internal module

            // Handle wildcard imports - we keep these for simplicity
            if (member.isWildcardImport) {
              continue;
            }

            // Check each imported item
            if (!member.items) {
              throw new Error(
                `Could not find items for import ${moduleName} in ${path}`,
              );
            }

            const indexesToRemoveForImport: {
              startIndex: number;
              endIndex: number;
            }[] = [];

            for (const item of member.items) {
              const itemName = item.identifierNode.text;
              const lookupRef = item.aliasNode?.text || itemName;

              // Get all symbols from the module
              const exports = extractedExportExtractor.getSymbols(
                resolvedModule.path,
              );
              // Find the specific symbol
              const currentSymbol = exports.symbols.find(
                (s) => s.id === itemName,
              );

              if (currentSymbol) {
                extractedFilesUsageResolver.resolveInternalUsageForSymbol(
                  fileData.rootNode,
                  nodesToExclude,
                  resolvedModule,
                  currentSymbol,
                  lookupRef,
                  internalUsageMap,
                );

                // Check if this symbol was found in usage
                const moduleUsage = internalUsageMap.get(resolvedModule.path);
                if (
                  !moduleUsage ||
                  !moduleUsage.symbols.has(currentSymbol.id)
                ) {
                  // Mark unused item for removal
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
              } else {
                // Symbol not found, consider it unused
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

            // Handle removals for from imports
            if (indexesToRemoveForImport.length > 0) {
              if (indexesToRemoveForImport.length === member.items.length) {
                // Remove the entire import statement if all items are unused
                indexesToRemove.push({
                  startIndex: importStatement.node.startIndex,
                  endIndex: importStatement.node.endIndex,
                });
              } else {
                // Remove only the unused items
                indexesToRemove.push(...indexesToRemoveForImport);
              }
            }
          } else {
            // It's an external module

            // Handle wildcard imports - we keep these for simplicity
            if (member.isWildcardImport) {
              continue;
            }

            // Check each imported item
            if (!member.items) {
              throw new Error(
                `Could not find items for import ${moduleName} in ${path}`,
              );
            }

            const indexesToRemoveForImport: {
              startIndex: number;
              endIndex: number;
            }[] = [];

            for (const item of member.items) {
              const itemName = item.identifierNode.text;
              const lookupRef = item.aliasNode?.text || itemName;

              extractedFilesUsageResolver.resolveExternalUsageForItem(
                fileData.rootNode,
                nodesToExclude,
                { moduleName, itemName },
                lookupRef,
                externalUsageMap,
              );

              // Check if this item is used
              const moduleUsage = externalUsageMap.get(moduleName);
              if (!moduleUsage || !moduleUsage.itemNames.has(itemName)) {
                // Mark unused item for removal
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

            // Handle removals for from imports
            if (indexesToRemoveForImport.length > 0) {
              if (indexesToRemoveForImport.length === member.items.length) {
                // Remove the entire import if all items are unused
                indexesToRemove.push({
                  startIndex: importStatement.node.startIndex,
                  endIndex: importStatement.node.endIndex,
                });
              } else {
                // Remove only the unused items
                indexesToRemove.push(...indexesToRemoveForImport);
              }
            }
          }
        }
      }

      // Apply the removals to the file content
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
