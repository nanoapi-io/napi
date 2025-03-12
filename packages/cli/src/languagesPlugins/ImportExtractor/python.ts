import Parser from "tree-sitter";
import {
  ImportExtractor,
  ImportStatement,
  ImportModule,
  pythonRegularModule,
  ImportEntity,
  pythonFromModule,
} from "./types";
import { EntityType, ExportMap, unknownEntity } from "../ExportExtractor/types";
import path from "path";

/**
 * Resolves the module(s) and imported entities from an import statement.
 * @param currentFilePath - The file where the import statement exists.
 * @param source - The module being imported, including its syntax nodes.
 * @param instances - An array of imported instances with their syntax nodes.
 * @param exportMap - The global export map containing known module exports.
 * @returns An array of resolved modules and their imported entities.
 */
export function resolveModules(
  currentFilePath: string,
  source: {
    node: Parser.SyntaxNode;
    identifierNode: Parser.SyntaxNode;
    aliasNode?: Parser.SyntaxNode;
  },
  instances: {
    node: Parser.SyntaxNode;
    identifierNode: Parser.SyntaxNode;
    aliasNode?: Parser.SyntaxNode;
  }[],
  exportMap: ExportMap,
): ImportModule[] {
  const modules: ImportModule[] = [];
  const sourceText = source.identifierNode.text;

  // Attempt to resolve the module path
  const resolvedSource = resolveImportSource(
    currentFilePath,
    sourceText,
    exportMap,
  );
  const isExternal = resolvedSource === undefined;

  // Handle wildcard imports (e.g., `from module import *`)
  if (instances.length === 0) {
    const allEntities: ImportEntity[] = [];

    if (!isExternal && resolvedSource) {
      const exportInstance = exportMap[resolvedSource];

      if (exportInstance) {
        exportInstance.exportStatements.forEach((stmt) => {
          stmt.members.forEach((member) => {
            const node = member.aliasNode || member.identifierNode;
            allEntities.push({
              type: member.type,
              entityNode: node,
              entityIdentifierNode: node,
              entityAliasNode: undefined,
            });
          });
        });
      }
    }

    modules.push({
      source: sourceText,
      isWildcard: true,
      isExternal,
      resolvedSource,
      moduleNode: source.node,
      moduleIdentifierNode: source.identifierNode,
      moduleAliasNode: source.aliasNode,
      entities: allEntities,
    });

    return modules;
  }

  // Process specific entity imports (e.g., `from module import foo, bar`)
  const entities: ImportEntity[] = instances.map(
    ({ node, identifierNode, aliasNode }) => {
      let type: EntityType = unknownEntity;

      if (!isExternal && resolvedSource) {
        const exportInstance = exportMap[resolvedSource];

        if (exportInstance) {
          exportInstance.exportStatements.forEach((stmt) => {
            stmt.members.forEach((member) => {
              if (
                member.aliasNode &&
                member.aliasNode.text === identifierNode.text
              ) {
                type = member.type;
              } else if (
                !member.aliasNode &&
                member.identifierNode.text === identifierNode.text
              ) {
                type = member.type;
              }
            });
          });
        }
      }

      return {
        type,
        entityNode: node,
        entityIdentifierNode: identifierNode,
        entityAliasNode: aliasNode,
      };
    },
  );

  modules.push({
    source: sourceText,
    isWildcard: false,
    isExternal,
    resolvedSource,
    moduleNode: source.node,
    moduleIdentifierNode: source.identifierNode,
    moduleAliasNode: source.aliasNode,
    entities,
  });

  return modules;
}

/**
 * Resolves the source file of an import using the export map.
 * @param importingFile - The file where the import is found.
 * @param importSource - The import path (e.g., "models", "order.models").
 * @param exportMap - The global export map containing all known internal modules.
 * @returns The resolved file path if found, or `undefined` if it's external.
 */
function resolveImportSource(
  importingFile: string,
  importSource: string,
  exportMap: ExportMap,
): string | undefined {
  const importPath = importSource.replace(/\./g, "/");

  // ✅ 1. Check for direct module file and package init
  const moduleFile = `${importPath}.py`;
  const packageInitFile = `${importPath}/__init__.py`;

  let bestMatch: string | undefined;
  let bestDepth = Infinity;

  for (const [filePath, metadata] of Object.entries(exportMap)) {
    const isModuleFile = filePath.endsWith(moduleFile);
    const isPackageInit = filePath.endsWith(packageInitFile);

    if (isModuleFile || isPackageInit) {
      const depth = getPathDepthDifference(importingFile, filePath);

      if (depth < bestDepth) {
        bestMatch = metadata.filePath;
        bestDepth = depth;
      }
    }
  }

  return bestMatch;
}

/**
 * Computes the depth difference between the importing file and a candidate module.
 * Lower values indicate a closer match.
 * @param baseDir - Directory of the importing file.
 * @param candidatePath - File path of the potential module.
 * @returns The number of directory levels between the paths.
 */
function getPathDepthDifference(
  baseDir: string,
  candidatePath: string,
): number {
  const baseParts = baseDir.split(path.sep);
  const candidateParts = candidatePath.split(path.sep);

  let commonDepth = 0;
  while (
    commonDepth < baseParts.length &&
    commonDepth < candidateParts.length &&
    baseParts[commonDepth] === candidateParts[commonDepth]
  ) {
    commonDepth++;
  }

  return Math.abs(baseParts.length - commonDepth);
}

/**
 * Python-specific implementation of ImportExtractor.
 */
export default class PythonImportExtractor extends ImportExtractor {
  /**
   * Extracts import statements from a Python file.
   * @param filePath - Path of the file being analyzed.
   * @param rootNode - Root syntax node of the parsed file.
   * @param exportMap - Map of known exports for resolving internal imports.
   * @returns A list of detected import statements.
   */
  run(
    filePath: string,
    rootNode: Parser.SyntaxNode,
    exportMap: ExportMap,
  ): ImportStatement[] {
    const imports: ImportStatement[] = [];

    imports.push(...this.extractRegularImports(filePath, rootNode, exportMap));
    imports.push(...this.extractFromImports(filePath, rootNode, exportMap));

    return imports;
  }

  /**
   * Extracts `import module` statements.
   * @param filePath - Path of the current file.
   * @param node - Root syntax node.
   * @param exportMap - Map of known exports.
   * @returns A list of detected import statements.
   */
  private extractRegularImports(
    filePath: string,
    node: Parser.SyntaxNode,
    exportMap: ExportMap,
  ): ImportStatement[] {
    const importStatements: ImportStatement[] = [];

    const importQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_statement
          name: (dotted_name)
        ) @node
      )
      `,
    );

    const importCaptures = importQuery.captures(node);
    importCaptures.forEach(({ node }) => {
      const moduleNodes = node.children.filter(
        (child) => child.type === "dotted_name",
      );

      const modules: ImportModule[] = [];
      moduleNodes.forEach((moduleNode) => {
        const source = moduleNode.text;
        const resolvedSource = this.resolveImportSource(
          filePath,
          source,
          exportMap,
        );

        const module: ImportModule = {
          source,
          isWildcard: true,
          isExternal: !resolvedSource,
          resolvedSource,
          moduleNode: node,
          moduleIdentifierNode: moduleNode,
          moduleAliasNode: undefined,
          entities: [], // Regular imports do not have specific entities.
        };

        modules.push(module);
      });

      importStatements.push({
        statementNode: node,
        modules,
        type: pythonRegularModule,
      });
    });

    const importWithAliasQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_statement
          name: (aliased_import
            name: (dotted_name)
            alias: (identifier)
          )
        ) @node
      )
      `,
    );

    const importWithAliasCaptures = importWithAliasQuery.captures(node);
    importWithAliasCaptures.forEach(({ node }) => {
      const moduleNodes = node.children.filter(
        (child) => child.type === "aliased_import",
      );

      const modules: ImportModule[] = [];
      moduleNodes.forEach((moduleNode) => {
        const identifierNode = moduleNode.childForFieldName("name");
        if (!identifierNode) return; // TODO something here
        const aliasNode = moduleNode.childForFieldName("alias") || undefined;

        const source = identifierNode.text;
        const resolvedSource = this.resolveImportSource(
          filePath,
          source,
          exportMap,
        );

        const module: ImportModule = {
          source,
          isWildcard: true,
          isExternal: !resolvedSource,
          resolvedSource,
          moduleNode: moduleNode,
          moduleIdentifierNode: identifierNode,
          moduleAliasNode: aliasNode,
          entities: [], // Regular imports do not have specific entities.
        };

        modules.push(module);
      });

      importStatements.push({
        statementNode: node,
        modules,
        type: pythonRegularModule,
      });
    });

    return importStatements;
  }

  /**
   * Extracts `from module import entity` statements.
   * @param filePath - Path of the current file.
   * @param node - Root syntax node.
   * @param exportMap - Map of known exports.
   * @returns A list of detected import statements.
   */
  private extractFromImports(
    filePath: string,
    node: Parser.SyntaxNode,
    exportMap: ExportMap,
  ) {
    const importStatements: ImportStatement[] = [];

    const importQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_from_statement
          module_name: (dotted_name)
          name: (dotted_name)
        ) @node
      )
      `,
    );

    const importCaptures = importQuery.captures(node);
    importCaptures.forEach(({ node }) => {
      const moduleNode = node.childForFieldName("module_name");
      if (!moduleNode) return; // TODO something here
      const entityNodes = node.childrenForFieldName("name");
      if (entityNodes.length === 0) return; // TODO something here

      const source = moduleNode.text;
      const resolvedSource = this.resolveImportSource(
        filePath,
        source,
        exportMap,
      );
      const isExternal = !resolvedSource;

      const entities: ImportEntity[] = [];

      entityNodes.forEach((entityNode) => {
        if (isExternal) {
          const entity: ImportEntity = {
            type: unknownEntity,
            entityNode,
            entityIdentifierNode: entityNode,
            entityAliasNode: undefined,
          };
          entities.push(entity);
          return;
        }

        // get entity type from export map
        const exportInstance = exportMap[entityNode.text];
        if (!exportInstance) {
          const entity: ImportEntity = {
            type: unknownEntity,
            entityNode,
            entityIdentifierNode: entityNode,
            entityAliasNode: undefined,
          };
          entities.push(entity);
          return;
        }

        let type: EntityType = unknownEntity;
        exportInstance.exportStatements.forEach((statement) => {
          statement.members.forEach((member) => {
            if (member.aliasNode) {
              if (member.aliasNode.text === entityNode.text) {
                type = member.type;
              }
            } else {
              if (member.identifierNode.text === entityNode.text) {
                type = member.type;
              }
            }
          });
        });

        const entity: ImportEntity = {
          type,
          entityNode,
          entityIdentifierNode: entityNode,
          entityAliasNode: undefined,
        };

        entities.push(entity);
      });

      const module: ImportModule = {
        source,
        isWildcard: false,
        isExternal,
        resolvedSource,
        moduleNode: node,
        moduleIdentifierNode: moduleNode,
        moduleAliasNode: undefined,
        entities,
      };

      importStatements.push({
        statementNode: node,
        modules: [module],
        type: pythonFromModule,
      });
    });

    const importWithAliasQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (import_from_statement
          module_name: (dotted_name)
          name: (aliased_import
            name: (dotted_name)
            alias: (identifier)
          )
        ) @node
      )
      `,
    );

    const importWithAliasCaptures = importWithAliasQuery.captures(node);
    importWithAliasCaptures.forEach(({ node }) => {
      const moduleNode = node.childForFieldName("module_name");
      if (!moduleNode) return; // TODO something here
      const aliasedImportNodes = node.childrenForFieldName("name");
      if (aliasedImportNodes.length === 0) return; // TODO something here

      const source = moduleNode.text;
      const resolvedSource = this.resolveImportSource(
        filePath,
        source,
        exportMap,
      );
      const isExternal = !resolvedSource;

      const module: ImportModule = {
        source,
        isWildcard: false,
        isExternal,
        resolvedSource,
        moduleNode: moduleNode,
        moduleIdentifierNode: moduleNode,
        moduleAliasNode: undefined,
        entities: [] as ImportEntity[],
      };

      aliasedImportNodes.forEach((aliasedImportNode) => {
        const identifierNode = aliasedImportNode.childForFieldName("name");
        if (!identifierNode) return; // TODO something here
        const aliasNode =
          aliasedImportNode.childForFieldName("alias") || undefined;
        if (isExternal) {
          const entity: ImportEntity = {
            type: unknownEntity,
            entityNode: aliasedImportNode,
            entityIdentifierNode: identifierNode,
            entityAliasNode: aliasNode,
          };
          module.entities.push(entity);
        } else {
          // get entity type from export map
          const exportInstance = exportMap[identifierNode.text];
          if (!exportInstance) {
            const entity: ImportEntity = {
              type: unknownEntity,
              entityNode: aliasedImportNode,
              entityIdentifierNode: identifierNode,
              entityAliasNode: aliasNode,
            };
            module.entities.push(entity);
          } else {
            let type: EntityType = unknownEntity;
            exportInstance.exportStatements.forEach((statement) => {
              statement.members.forEach((member) => {
                if (member.aliasNode) {
                  if (member.aliasNode.text === identifierNode.text) {
                    type = member.type;
                  }
                } else {
                  if (member.identifierNode.text === identifierNode.text) {
                    type = member.type;
                  }
                }
              });
            });

            const entity: ImportEntity = {
              type,
              entityNode: aliasedImportNode,
              entityIdentifierNode: identifierNode,
              entityAliasNode: aliasNode,
            };
            module.entities.push(entity);
          }
        }
      });

      importStatements.push({
        statementNode: node,
        modules: [module],
        type: pythonFromModule,
      });
    });

    return importStatements;
  }

  /**
   * Resolves the source file of an import using the export map.
   * @param importingFile - The file where the import is found.
   * @param importSource - The import path (e.g., "models", "order.models").
   * @param exportMap - The global export map containing all known internal modules.
   * @returns The resolved file path if found, or `undefined` if it's external.
   */
  private resolveImportSource(
    importingFile: string,
    importSource: string,
    exportMap: ExportMap,
  ): string | undefined {
    const importPath = importSource.replace(/\./g, "/");

    // ✅ 1. First, check for direct module file and package init
    const moduleFile = `${importPath}.py`;
    const packageInitFile = `${importPath}/__init__.py`;

    let bestModuleMatch: string | undefined;
    let bestModuleDepth = Infinity;
    let bestPackageMatch: string | undefined;
    let bestPackageDepth = Infinity;

    for (const [filePath, metadata] of Object.entries(exportMap)) {
      const isModuleFile = filePath.endsWith(moduleFile);
      const isPackageInit = filePath.endsWith(packageInitFile);

      if (isModuleFile || isPackageInit) {
        const depth = this.getPathDepthDifference(importingFile, filePath);

        if (isModuleFile && depth < bestModuleDepth) {
          bestModuleMatch = metadata.filePath;
          bestModuleDepth = depth;
        }

        if (isPackageInit && depth < bestPackageDepth) {
          bestPackageMatch = metadata.filePath;
          bestPackageDepth = depth;
        }
      }
    }

    // ✅ 2. Return the better match (prefer the closest one)
    if (bestModuleMatch && bestPackageMatch) {
      // Prioritize module file over package init if at most 1 level deeper
      return bestModuleDepth <= bestPackageDepth + 1
        ? bestModuleMatch
        : bestPackageMatch;
    }

    return bestModuleMatch || bestPackageMatch;
  }

  /**
   * Computes the depth difference between the importing file and a candidate module.
   * Lower values indicate a closer match.
   * @param baseDir - Directory of the importing file.
   * @param candidatePath - File path of the potential module.
   * @returns The number of directory levels between the paths.
   */
  private getPathDepthDifference(
    baseDir: string,
    candidatePath: string,
  ): number {
    const baseParts = baseDir.split(path.sep);
    const candidateParts = candidatePath.split(path.sep);

    let commonDepth = 0;
    while (
      commonDepth < baseParts.length &&
      commonDepth < candidateParts.length &&
      baseParts[commonDepth] === candidateParts[commonDepth]
    ) {
      commonDepth++;
    }

    return Math.abs(baseParts.length - commonDepth);
  }
}
