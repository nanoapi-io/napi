import {
  SymbolNode,
  NamespaceNode,
  CSharpNamespaceMapper,
} from "../namespaceMapper";
import { csharpParser } from "../../../helpers/treeSitter/parsers";
import Parser from "tree-sitter";

const extensionMethodQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
  ((method_declaration
    parameters : (parameter_list
    (parameter
      (modifier) @mod)
    ))
  (#eq? @mod "this")) @method
`,
);

/**
 * Interface representing an extension method in C#.
 */
export interface ExtensionMethod {
  /**
   * The syntax node of the extension method.
   */
  node: Parser.SyntaxNode;
  /**
   * The symbol associated with the extension method.
   */
  symbol: SymbolNode;
  /**
   * The name of the extension method.
   */
  name: string;
  /**
   * The type of the extension method.
   */
  type: string;
  /**
   * The type that is being extended
   */
  extendedType: string;
}

/**
 * Record for all extensions in the project.
 * Key : name of a namespace that has extensions.
 * Value : the extensions of said namespace.
 */
export type ExtensionMethodMap = Record<string, ExtensionMethod[]>;

export class CSharpExtensionResolver {
  private namespaceMapper: CSharpNamespaceMapper;
  private extensions: ExtensionMethodMap = {};

  constructor(namespaceMapper: CSharpNamespaceMapper) {
    this.namespaceMapper = namespaceMapper;
    this.resolveExtensionMethodsInNamespaceTree();
  }

  /**
   * Returns the extensions found in the project.
   * @returns A map of extension methods found in the project.
   */
  getExtensions(): ExtensionMethodMap {
    return this.extensions;
  }

  /**
   * Resolves extension methods in a symbol.
   * @param symbol - the symbol to analyse.
   * @returns A map of extension methods found in the file.
   */
  private resolveExtensionMethods(symbol: SymbolNode): ExtensionMethod[] {
    const extensions: ExtensionMethod[] = [];
    const extensionMethods = extensionMethodQuery.captures(symbol.node);
    for (const ext of extensionMethods) {
      if (ext.name === "mod") continue;
      const methodNode = ext.node;
      const methodName = methodNode.childForFieldName("name")?.text;
      const methodType =
        methodNode.childForFieldName("returns")?.text || "void";
      const parameters = methodNode.childrenForFieldName("parameters");
      let extendedType = "void";
      parameters.forEach((param) => {
        if (param.text.startsWith("this ")) {
          extendedType = param.childForFieldName("type")?.text || "void";
        }
      });
      if (methodName) {
        extensions.push({
          node: methodNode,
          symbol: symbol,
          name: methodName,
          type: methodType,
          extendedType: extendedType,
        });
      }
    }
    return extensions;
  }

  /**
   * Resolves extension methods in a namespace.
   * @param namespace - The namespace to analyze.
   * @returns A map of extension methods found in the namespace.
   */
  private resolveExtensionMethodsInNamespace(
    namespace: NamespaceNode,
  ): ExtensionMethod[] {
    const extensions: ExtensionMethod[] = [];
    for (const symbol of namespace.exports) {
      const extMethods = this.resolveExtensionMethods(symbol);
      Object.assign(extensions, extMethods);
    }
    return extensions;
  }

  /**
   * Resolves extension methods in the namespace tree.
   * @returns A map of extension methods found in the project.
   */
  private resolveExtensionMethodsInNamespaceTree() {
    this.extensions = {};

    const resolveExtensionsRecursively = (namespace: NamespaceNode) => {
      const extMethods = this.resolveExtensionMethodsInNamespace(namespace);
      if (Object.keys(extMethods).length > 0) {
        this.extensions[this.namespaceMapper.getFullNSName(namespace)] =
          extMethods;
      }
      for (const childNamespace of namespace.childrenNamespaces) {
        resolveExtensionsRecursively(childNamespace);
      }
    };

    resolveExtensionsRecursively(this.namespaceMapper.nsTree);
  }
}
