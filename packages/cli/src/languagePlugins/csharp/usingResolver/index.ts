import Parser from "tree-sitter";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";

// Constants representing different types of 'using' directives in C#
export const GLOBAL_USING = "global";
export const LOCAL_USING = "local";
export const USING_STATIC = "static";
export const USING_ALIAS = "alias";

// Type alias for the different 'using' directive types
export type UsingType =
  | typeof GLOBAL_USING
  | typeof LOCAL_USING
  | typeof USING_STATIC
  | typeof USING_ALIAS;

// Interface representing a 'using' directive in the code
export interface UsingDirective {
  node: Parser.SyntaxNode; // The syntax node corresponding to the 'using' directive
  type: UsingType; // The type of 'using' directive
  id: string; // The identifier or qualified name being imported
  alias?: string; // Optional alias for the imported identifier
}

// Interface representing an internal symbol resolved from a 'using' directive
export interface InternalSymbol {
  usingtype: UsingType; // The type of 'using' directive
  alias?: string; // Optional alias for the symbol
  symbol?: SymbolNode; // The symbol node if it is a class or type
  namespace?: NamespaceNode; // The namespace node if it is a namespace
}

// Interface representing an external symbol resolved from a 'using' directive
export interface ExternalSymbol {
  usingtype: UsingType; // The type of 'using' directive
  alias?: string; // Optional alias for the symbol
  name: string; // The name of the external symbol
}

// Interface representing the resolved imports from a file
export interface ResolvedImports {
  internal: InternalSymbol[]; // List of internal symbols
  external: ExternalSymbol[]; // List of external symbols
}

// Class responsible for resolving 'using' directives in C# files
export class CSharpUsingResolver {
  private nsMapper: CSharpNamespaceMapper; // Mapper for namespaces and symbols
  private usingDirectives: UsingDirective[] = []; // List of parsed 'using' directives

  constructor(nsMapper: CSharpNamespaceMapper) {
    this.nsMapper = nsMapper;
  }

  // Parses the file and returns all using directives.
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
      const id = importNode ? importNode.text : "";
      const aliasNode = node.childForFieldName("name");
      const alias = aliasNode ? aliasNode.text : undefined;
      return { node, type, id, alias };
    });
    return this.usingDirectives;
  }

  // Determines the type of 'using' directive based on its text content
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

  // Resolves a single 'using' directive to either an internal or external symbol
  private resolveUsingDirective(
    directive: UsingDirective,
  ): InternalSymbol | ExternalSymbol {
    const { type, id, alias } = directive;
    const symbol = this.nsMapper.findClassInTree(this.nsMapper.nsTree, id);
    if (symbol) {
      return { usingtype: type, alias, symbol };
    }
    const namespace = this.nsMapper.findNamespaceInTree(
      this.nsMapper.nsTree,
      id,
    );
    if (namespace) {
      return { usingtype: type, alias, namespace };
    }
    return { usingtype: type, alias, name: id };
  }

  // Resolves all 'using' directives in a file and categorizes them into internal and external symbols
  public resolveUsingDirectives(filepath: string): ResolvedImports {
    const internal: InternalSymbol[] = [];
    const external: ExternalSymbol[] = [];
    this.parseUsingDirectives(filepath).forEach((directive) => {
      const resolved = this.resolveUsingDirective(directive);
      if ("symbol" in resolved || "namespace" in resolved) {
        internal.push(resolved);
      } else {
        external.push(resolved as ExternalSymbol);
      }
    });
    return { internal, external };
  }

  public findClassInImports(
    imports: ResolvedImports,
    className: string,
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

    return null;
  }
}
