import Parser from "tree-sitter";
import { ImportExtractor, ImportStatement } from "./types";
import { ExportMap } from "../ExportExtractor/types";
import path from "path";

/**
 * Python-specific implementation of ImportExtractor.
 */
class PythonImportExtractor extends ImportExtractor {
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
    // imports.push(...this.extractFromImports(filePath, rootNode, exportMap));

    return imports;
  }

  /**
   * Extracts `import module` and `import module as alias` statements.
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
      const moduleNode = node.childForFieldName("name");

      if (!moduleNode) return;

      const source = moduleNode.text;
      const resolvedSource = this.resolveImportSource(
        filePath,
        source,
        exportMap,
      );

      importStatements.push({
        source,
        isExternal: !resolvedSource,
        resolvedSource,
        node,
        kind: "python-regular",
        identifiers: [
          {
            type: "namespace",
            identifierNode: moduleNode,
            aliasNode: undefined,
          },
        ],
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
      const moduleNode = node
        .childForFieldName("name")
        ?.childForFieldName("name");
      const aliasNode = node
        .childForFieldName("name")
        ?.childForFieldName("alias");

      if (!moduleNode || !aliasNode) return;

      const source = moduleNode.text;
      const resolvedSource = this.resolveImportSource(
        filePath,
        source,
        exportMap,
      );

      importStatements.push({
        source,
        isExternal: !resolvedSource,
        resolvedSource,
        node,
        kind: "python-regular",
        identifiers: [
          { type: "namespace", identifierNode: moduleNode, aliasNode },
        ],
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
      // we want to prioritize the module file first
      // if it is 1 level deeper than the package init
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

export default PythonImportExtractor;
