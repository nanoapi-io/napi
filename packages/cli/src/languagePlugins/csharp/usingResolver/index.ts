import Parser from "tree-sitter";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";
import { CSharpProjectMapper } from "../projectMapper";

// Constants representing different types of 'using' directives in C#
export const GLOBAL_USING = "global";
export const LOCAL_USING = "local";
export const USING_STATIC = "static";
export const USING_ALIAS = "alias";

/** Type alias for the different 'using' directive types */
export type UsingType =
  | typeof GLOBAL_USING
  | typeof LOCAL_USING
  | typeof USING_STATIC
  | typeof USING_ALIAS;

/**
 * Interface representing a 'using' directive in the code
 */
export interface UsingDirective {
  /** The syntax node corresponding to the 'using' directive */
  node: Parser.SyntaxNode;
  /** The type of 'using' directive */
  type: UsingType;
  /** The filepath it is imported in */
  filepath: string;
  /** The identifier or qualified name being imported */
  id: string;
  /** Optional alias for the imported identifier */
  alias?: string;
}

/**
 * Interface representing an internal symbol resolved from a 'using' directive
 */
export interface InternalSymbol {
  /** The type of 'using' directive */
  usingtype: UsingType;
  /** The filepath it is imported in */
  filepath: string;
  /** Optional alias for the symbol */
  alias?: string;
  /** The symbol node if it is a class or type */
  symbol?: SymbolNode;
  /** The namespace node if it is a namespace */
  namespace?: NamespaceNode;
}

/**
 * Interface representing an external symbol resolved from a 'using' directive
 */
export interface ExternalSymbol {
  /** The type of 'using' directive */
  usingtype: UsingType;
  /** The filepath it is imported in */
  filepath: string;
  /** Optional alias for the symbol */
  alias?: string;
  /** The name of the external symbol */
  name: string;
}

/**
 * Interface representing the resolved imports from a file
 */
export interface ResolvedImports {
  /** List of internal symbols */
  internal: InternalSymbol[];
  /** List of external symbols */
  external: ExternalSymbol[];
}

/**
 * Class responsible for resolving 'using' directives in C# files
 */
export class CSharpUsingResolver {
  /** Mapper for namespaces and symbols */
  private nsMapper: CSharpNamespaceMapper;
  /** List of parsed 'using' directives */
  private usingDirectives: UsingDirective[] = [];
  private cachedImports: Map<string, ResolvedImports> = new Map<
    string,
    ResolvedImports
  >();
  public projectmapper: CSharpProjectMapper;
  private cachedExternalDeps: Set<string> = new Set<string>();

  constructor(
    nsMapper: CSharpNamespaceMapper,
    projectmapper: CSharpProjectMapper,
  ) {
    this.nsMapper = nsMapper;
    this.projectmapper = projectmapper;
  }

  /**
   * Parses the file and returns all using directives.
   * @param filepath - The path to the file to parse.
   * @returns An array of UsingDirective objects.
   */
  public parseUsingDirectives(filepath: string): UsingDirective[] {
    const file = this.nsMapper.getFile(filepath);
    if (!file) {
      return [];
    }
    const usingNodes = file.rootNode.descendantsOfType("using_directive");
    this.usingDirectives = usingNodes.map((node) => {
      const type = this.getUsingType(node);
      // The imported namespace or class is an identifier or a qualified name.
      // Only the alias has the field name "name".
      // The imported namespace isn't named in the tree, so we have to pull
      // this kind of black magic to find it.
      const importNode = node.children.find(
        (child) =>
          (child.type === "identifier" || child.type === "qualified_name") &&
          child !== node.childForFieldName("name"),
      );
      let id = importNode ? importNode.text : "";
      // Remove the :: prefix from the id if it exists
      id = id.includes("::") ? (id.split("::").pop() as string) : id;
      const aliasNode = node.childForFieldName("name");
      const alias = aliasNode ? aliasNode.text : undefined;
      return { node, type, filepath, id, alias };
    });
    return this.usingDirectives;
  }

  /**
   * Determines the type of 'using' directive based on its text content.
   * @param node - The syntax node representing the 'using' directive.
   * @returns The type of 'using' directive.
   */
  private getUsingType(node: Parser.SyntaxNode): UsingType {
    // There is probably a cleaner way to do this.
    if (node.text.includes("using static")) {
      return USING_STATIC;
    }
    if (node.text.includes("=")) {
      return USING_ALIAS;
    }
    if (node.text.includes("global using")) {
      return GLOBAL_USING;
    }
    return LOCAL_USING;
  }

  /**
   * Resolves a single 'using' directive to either an internal or external symbol.
   * @param directive - The 'using' directive to resolve.
   * @returns An InternalSymbol or ExternalSymbol object.
   */
  private resolveUsingDirective(
    directive: UsingDirective,
  ): InternalSymbol | ExternalSymbol {
    const { type, filepath, id, alias } = directive;
    // Check if the using directive is a known external dependency
    if (this.cachedExternalDeps.has(id)) {
      return { usingtype: type, filepath, alias, name: id };
    }
    const symbol = this.nsMapper.findClassInTree(this.nsMapper.nsTree, id);
    if (symbol) {
      return { usingtype: type, filepath, alias, symbol };
    }
    const namespace = this.nsMapper.findNamespaceInTree(
      this.nsMapper.nsTree,
      id,
    );
    if (namespace) {
      return { usingtype: type, filepath, alias, namespace };
    }
    // If the directive is not found in the namespace tree, treat it as an external symbol
    // and cache it
    this.cachedExternalDeps.add(id);
    return { usingtype: type, filepath, alias, name: id };
  }

  /**
   * Resolves all 'using' directives in a file and categorizes them into internal and external symbols.
   * @param filepath - The path to the file to resolve.
   * @returns A ResolvedImports object containing internal and external symbols.
   */
  public resolveUsingDirectives(filepath: string): ResolvedImports {
    const globalUsings: ResolvedImports = { internal: [], external: [] };
    if (this.cachedImports.has(filepath)) {
      return this.cachedImports.get(filepath) as ResolvedImports;
    }
    const internal: InternalSymbol[] = [];
    const external: ExternalSymbol[] = [];
    this.parseUsingDirectives(filepath).forEach((directive) => {
      const resolved = this.resolveUsingDirective(directive);
      if ("symbol" in resolved || "namespace" in resolved) {
        internal.push(resolved);
        if (directive.type === GLOBAL_USING) {
          globalUsings.internal.push(resolved);
        }
      } else {
        external.push(resolved as ExternalSymbol);
        if (directive.type === GLOBAL_USING) {
          globalUsings.external.push(resolved as ExternalSymbol);
        }
      }
    });
    const resolvedimports = { internal, external };
    // Update the global usings for the project
    const subproject = this.projectmapper.findSubprojectForFile(filepath);
    if (subproject) {
      this.projectmapper.updateGlobalUsings(globalUsings, subproject);
    }
    this.cachedImports.set(filepath, resolvedimports);
    return resolvedimports;
  }

  public getGlobalUsings(filepath: string): ResolvedImports {
    return this.projectmapper.getGlobalUsings(filepath);
  }

  /**
   * Finds a class in the resolved imports.
   * @param imports - The resolved imports to search.
   * @param className - The name of the class to find.
   * @returns The SymbolNode of the class if found, otherwise null.
   */
  public findClassInImports(
    imports: ResolvedImports,
    className: string,
    filepath: string,
  ): SymbolNode | null {
    // Handle qualified class names with aliases
    const parts = className.split(".");
    for (let i = 0; i < parts.length; i++) {
      const aliasMatch = imports.internal.find(
        (symbol) => symbol.alias === parts[i],
      );
      if (aliasMatch && aliasMatch.symbol) {
        parts[i] = aliasMatch.symbol.name;
      }
    }
    const reconstructedClassName = parts.join(".");
    // Check if the class is directly imported
    const found = imports.internal.find(
      (symbol) =>
        "symbol" in symbol &&
        (symbol.symbol?.name === reconstructedClassName ||
          symbol.alias === reconstructedClassName),
    );
    if (found) {
      return found.symbol ?? null;
    }
    // Check if the class is imported through a namespace
    for (const symbol of imports.internal) {
      if ("namespace" in symbol && symbol.namespace) {
        const nsFound = this.nsMapper.findClassInTree(
          symbol.namespace,
          reconstructedClassName,
        );
        if (nsFound) {
          return nsFound;
        }
      }
    }
    // Also check in global usings
    for (const symbol of this.getGlobalUsings(filepath).internal) {
      if ("namespace" in symbol && symbol.namespace) {
        const nsFound = this.nsMapper.findClassInTree(
          symbol.namespace,
          reconstructedClassName,
        );
        if (nsFound) {
          return nsFound;
        }
      }
    }

    return null;
  }
}
