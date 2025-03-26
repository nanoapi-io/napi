import Parser from "tree-sitter";
import {
  CSharpNamespaceMapper,
  NamespaceNode,
  SymbolNode,
} from "../namespaceMapper";

export const GLOBAL_USING = "global";
export const LOCAL_USING = "local";
export const USING_STATIC = "static";
export const USING_ALIAS = "alias";

export type UsingType =
  | typeof GLOBAL_USING
  | typeof LOCAL_USING
  | typeof USING_STATIC
  | typeof USING_ALIAS;

export interface UsingDirective {
  node: Parser.SyntaxNode;
  type: UsingType;
  idf: string;
  alias?: string;
}

export interface InternalSymbol {
  usingtype: UsingType;
  alias?: string;
  symbol?: SymbolNode;
  namespace?: NamespaceNode;
}

export interface ExternalSymbol {
  usingtype: UsingType;
  alias?: string;
  name: string;
}

export interface ResolvedImports {
  internal: InternalSymbol[];
  external: ExternalSymbol[];
}

export class CSharpUsingResolver {
  private nsMapper: CSharpNamespaceMapper;
  private usingDirectives: UsingDirective[] = [];

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
      const idf = importNode ? importNode.text : "";
      const aliasNode = node.childForFieldName("name");
      const alias = aliasNode ? aliasNode.text : undefined;
      return { node, type, idf, alias };
    });
    return this.usingDirectives;
  }

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

  private resolveUsingDirective(
    directive: UsingDirective,
  ): InternalSymbol | ExternalSymbol {
    const { type, idf, alias } = directive;
    const symbol = this.nsMapper.findClassInTree(this.nsMapper.nsTree, idf);
    if (symbol) {
      return { usingtype: type, alias, symbol };
    }
    const namespace = this.nsMapper.findNamespaceInTree(
      this.nsMapper.nsTree,
      idf,
    );
    if (namespace) {
      return { usingtype: type, alias, namespace };
    }
    return { usingtype: type, alias, name: idf };
  }

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
}
