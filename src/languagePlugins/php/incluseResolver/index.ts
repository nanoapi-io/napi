import type { PHPRegistree } from "../registree/index.ts";
import { type PHPFile, type PHPNode, SymbolNode } from "../registree/types.ts";
import type { PHPImports } from "./types.ts";
import {
  PHP_INCLUDE_QUERY,
  PHP_USE_DETECTION_QUERY,
  PHP_USE_QUERY,
} from "./queries.ts";
import type Parser from "tree-sitter";
import { dirname } from "@std/path";

export class PHPIncluseResolver {
  registree: PHPRegistree;
  imports: Map<string, PHPImports>;

  constructor(registree: PHPRegistree) {
    this.registree = registree;
    this.imports = new Map();
  }

  resolveImports(file: PHPFile) {
    if (this.imports.has(file.path)) {
      return this.imports.get(file.path)!;
    }
    const useImports = this.#resolveUseDirectives(file);
    const includeImports = this.#resolveIncludeDirectives(file);
    const imports: PHPImports = {
      resolved: new Map([
        ...useImports.resolved,
        ...includeImports.resolved,
      ]),
      unresolved: {
        paths: [
          ...useImports.unresolved.paths,
          ...includeImports.unresolved.paths,
        ],
        namespaces: [
          ...useImports.unresolved.namespaces,
          ...includeImports.unresolved.namespaces,
        ],
      },
    };
    this.imports.set(file.path, imports);
    return imports;
  }

  #resolveUseDirectives(file: PHPFile): PHPImports {
    const useDirectives = PHP_USE_DETECTION_QUERY.captures(file.rootNode);
    if (!useDirectives) {
      throw new Error(`Error when paring use directives for ${file.path}`);
    }
    const imports: PHPImports = {
      resolved: new Map(),
      unresolved: {
        paths: [],
        namespaces: [],
      },
    };
    for (const use of useDirectives) {
      const useClause = PHP_USE_QUERY.captures(use.node);
      if (!useClause) continue;
      let name: string | undefined = undefined;
      let node: PHPNode | undefined = undefined;
      for (const clause of useClause) {
        if (clause.name === "alias") {
          name = clause.node.text;
        } else {
          node = this.registree.tree.findNode(clause.node.text);
          if (node && !name) {
            name = node.name;
          } else if (!node && !name) {
            name = clause.node.text;
          }
        }
      }
      if (node && name) {
        if (node instanceof SymbolNode) {
          imports.resolved.set(name, node.symbols);
        } else {
          for (const [k, v] of node.children) {
            if (v instanceof SymbolNode) {
              imports.resolved.set(k, v.symbols);
            }
          }
        }
      } else if (name) {
        imports.unresolved.namespaces.push(name);
      }
    }
    return imports;
  }

  #splitBinary(binary: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const left = binary.childForFieldName("left")!;
    const right = binary.childForFieldName("right")!;
    const leftArr = [];
    const rightArr = [];
    if (left.type === "binary_expression") {
      leftArr.push(...this.#splitBinary(left));
    } else {
      leftArr.push(left);
    }
    if (right.type === "binary_expression") {
      rightArr.push(...this.#splitBinary(right));
    } else {
      rightArr.push(right);
    }
    return [...leftArr, ...rightArr];
  }

  #resolveIncludeDirectives(file: PHPFile) {
    const includeDirectives = PHP_INCLUDE_QUERY.captures(file.rootNode);
    if (!includeDirectives) {
      throw new Error(`Error when parsing include directives for ${file.path}`);
    }
    const imports: PHPImports = {
      resolved: new Map(),
      unresolved: {
        paths: [],
        namespaces: [],
      },
    };
    for (const include of includeDirectives) {
      if (include.name === "includestr") {
        const path = include.node.text;
        const importedfile = this.registree.registry.getFile(path, file.path);
        if (importedfile) {
          for (const [k, v] of importedfile.symbols) {
            if (imports.resolved.has(k)) {
              imports.resolved.get(k)!.push(...v);
            } else {
              imports.resolved.set(k, v);
            }
          }
        } else {
          imports.unresolved.paths.push(path);
        }
      } else if (include.name === "includebin") {
        const filepath = this.#splitBinary(include.node)
          .map((n) => n.text === "__DIR__" ? dirname(file.path) : n.text)
          .filter((n) => n !== "")
          .map((n) => n.replace(/['"]/g, ""))
          .join("/");
        const importedfile = this.registree.registry.getFile(
          filepath,
          file.path,
        );
        if (importedfile) {
          for (const [k, v] of importedfile.symbols) {
            if (imports.resolved.has(k)) {
              imports.resolved.get(k)!.push(...v);
            } else {
              imports.resolved.set(k, v);
            }
          }
        } else {
          imports.unresolved.paths.push(filepath);
        }
      }
    }
    return imports;
  }
}
