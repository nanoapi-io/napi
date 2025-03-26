import { PythonExportExtractor, SymbolType } from "../exportExtractor";
import {
  fromImportStatementType,
  PythonImportExtractor,
} from "../importExtractor";
import {
  PythonModuleType,
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonSimpleModuleMapper,
} from "../simpleModuleMapper";

export interface Symbol {
  /** The identifier as define it its source module */
  identifier: string;
  /** The alias used in the import statement if present.
   * eg: `from module import foo as f` => `alias = f`
   * undefined if no alias is used.
   * undefined if the sourceModule is the current module.
   */
  alias: string | undefined;
  /** The type of the symbol */
  type: SymbolType;
  /** Whether the symbol can be imported using a wildcard import */
  supportsWildcardImport: boolean;
  /** The full name of the source module */
  sourceModuleFullName: string;
}

export class PythonExtraModule {
  private exportExtractor: PythonExportExtractor;
  private importExtractor: PythonImportExtractor;
  private simpleModuleMapper: PythonSimpleModuleMapper;
  private directSymbolsCache: Symbol[] | undefined = undefined;
  private indirectSymbolsCache: Symbol[] | undefined = undefined;

  public name: string;
  public fullName: string;
  public filePath: string;
  public type: PythonModuleType;
  public children: Map<string, PythonExtraModule>;
  public parent: PythonExtraModule | undefined;

  constructor(
    moduleFullName: string, // dotted fullname of the module eg: `module.submodule`
    exportExtractor: PythonExportExtractor,
    importExtractor: PythonImportExtractor,
    simpleModuleMapper: PythonSimpleModuleMapper,
    parent?: PythonExtraModule,
  ) {
    this.exportExtractor = exportExtractor;
    this.importExtractor = importExtractor;
    this.simpleModuleMapper = simpleModuleMapper;

    let simpleModule = this.simpleModuleMapper.moduleMap;
    const parts = moduleFullName.split(".");
    if (parts.length === 1 && parts[0] === "") {
      // Root module do nothing
    } else {
      parts.forEach((part) => {
        const newModule = simpleModule.children.get(part);
        if (!newModule) {
          console.log(22222, parts);
          throw new Error(
            `Module ${moduleFullName} not found in the module map`,
          );
        }
        simpleModule = newModule;
      });
    }

    this.name = simpleModule.name;
    this.fullName = simpleModule.fullName;
    this.filePath = simpleModule.path;
    this.type = simpleModule.type;
    this.children = new Map();
    simpleModule.children.forEach((child) => {
      this.children.set(
        child.fullName,
        new PythonExtraModule(
          child.name,
          exportExtractor,
          importExtractor,
          simpleModuleMapper,
          this,
        ),
      );
    });
    this.parent = parent;
  }

  public getDirectSymbols(): Symbol[] {
    if (this.directSymbolsCache) {
      return this.directSymbolsCache;
    }

    const symbols: Symbol[] = [];

    if (!this.filePath || this.type === PYTHON_NAMESPACE_MODULE_TYPE) {
      // No direct symbol, it is not a file or a package
      return symbols;
    }

    const exportedSymbols = this.exportExtractor.getSymbols(this.filePath);

    exportedSymbols.symbols.forEach((symbol) => {
      symbols.push({
        identifier: symbol.id,
        alias: undefined,
        type: symbol.type,
        supportsWildcardImport: exportedSymbols.publicSymbols.includes(
          symbol.id,
        ),
        sourceModuleFullName: this.fullName,
      });
    });

    // Cache the result for future use
    this.directSymbolsCache = symbols;

    return symbols;
  }

  public getIndirectSymbols(): Symbol[] {
    if (this.indirectSymbolsCache) {
      return this.indirectSymbolsCache;
    }

    if (!this.filePath || this.type === PYTHON_NAMESPACE_MODULE_TYPE) {
      // No indirect symbol, it is not a file or a package
      return [] as Symbol[];
    }

    const visited = new Set<string>();
    const symbols = this.getIndirectSymbolsRecursive(visited);
    this.indirectSymbolsCache = symbols;

    return symbols;
  }

  /**
   * Recursively collects re-exported symbols available in this module
   * via from-import statements.
   *
   * - For wildcard imports, every symbol from the target module that supports wildcard import is added.
   * - For explicit imports, the symbol’s identifier always reflects the true definition, while alias is based on the import.
   *
   * @param visited A set of module full names that have been processed (to avoid cycles).
   * @returns An array of re-exported symbols.
   */
  private getIndirectSymbolsRecursive(visited: Set<string>): Symbol[] {
    if (visited.has(this.fullName)) {
      return [];
    }
    visited.add(this.fullName);

    const collected: Symbol[] = [];
    const importStatements = this.importExtractor.getImportStatements(
      this.filePath,
    );

    for (const impStmt of importStatements) {
      // We only process "from … import …" statements.
      if (impStmt.type !== fromImportStatementType) {
        continue;
      }

      // Resolve the target module using the source node text.
      const sourceText = impStmt.sourceNode?.text;
      if (!sourceText) continue;

      const resolvedModuleSimple = this.simpleModuleMapper.resolveImport(
        this.filePath,
        sourceText,
      );
      if (!resolvedModuleSimple) {
        continue;
      }

      // Retrieve the already-initialized module from the tree.
      const targetModule = this.getModuleByFullName(
        resolvedModuleSimple.fullName,
      );
      if (!targetModule) {
        continue;
      }

      // Gather the complete export surface from the target module.
      const targetDirect = targetModule.getDirectSymbols();
      const targetIndirect = targetModule.getIndirectSymbolsRecursive(visited);
      const targetAllSymbols = [...targetDirect, ...targetIndirect];

      for (const member of impStmt.members) {
        if (member.isWildcardImport) {
          // Wildcard imports add every symbol that supports wildcard import.
          for (const sym of targetAllSymbols) {
            if (sym.supportsWildcardImport) {
              collected.push({
                identifier: sym.identifier, // true source identifier
                alias: undefined,
                type: sym.type,
                supportsWildcardImport: sym.supportsWildcardImport,
                sourceModuleFullName: targetModule.fullName,
              });
            }
          }
        } else if (
          member.explicitSymbols &&
          member.explicitSymbols.length > 0
        ) {
          // For explicit imports (e.g. "from mod import foo" or "from mod import foo as f")
          for (const explicit of member.explicitSymbols) {
            const importedName = explicit.identifierNode.text;
            const alias = explicit.aliasNode
              ? explicit.aliasNode.text
              : undefined;
            // Look up the target symbol by its true source identifier.
            const targetSymbol = targetAllSymbols.find(
              (s) => s.identifier === importedName,
            );
            if (targetSymbol) {
              collected.push({
                identifier: targetSymbol.identifier, // always the true source identifier
                alias: alias, // alias from the import statement (if provided)
                type: targetSymbol.type,
                supportsWildcardImport: targetSymbol.supportsWildcardImport,
                sourceModuleFullName: targetModule.fullName,
              });
            }
          }
        }
      }
    }

    return collected;
  }

  /**
   * Retrieves an already-initialized module from the tree by its full dotted name.
   *
   * @param fullName The full dotted name of the target module.
   * @returns The corresponding PythonExtraModule, or undefined if not found.
   */
  public getModuleByFullName(fullName: string): PythonExtraModule | undefined {
    // Climb to the root of the module tree.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let root: PythonExtraModule = this;
    while (root.parent) {
      root = root.parent;
    }
    // Traverse the tree using the dotted path.
    const parts = fullName.split(".");
    let current: PythonExtraModule = root;
    for (const part of parts) {
      const next = current.children.get(part);
      if (!next) return undefined;
      current = next;
    }
    return current;
  }
}
