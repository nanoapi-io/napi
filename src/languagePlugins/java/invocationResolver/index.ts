import type { JavaImportResolver } from "../importResolver/index.ts";
import type { JavaImports } from "../importResolver/types.ts";
import type { JavaPackageMapper } from "../packageMapper/index.ts";
import { ConcreteNode } from "../packageMapper/types.ts";
import type { JavaFile } from "../packageResolver/types.ts";
import { JAVA_INVOCATION_QUERY, JAVA_VARIABLES_QUERY } from "./queries.ts";
import type { Invocations } from "./types.ts";

/**
 * Resolves Java method invocations and maps them to their corresponding imports or project nodes.
 */
export class JavaInvocationResolver {
  mapper: JavaPackageMapper;
  imports: Map<string, JavaImports>;
  invocations: Map<string, Invocations>;

  /**
   * Constructs a new JavaInvocationResolver.
   *
   * @param resolver - An instance of JavaImportResolver containing the package mapper and imports.
   */
  constructor(resolver: JavaImportResolver) {
    this.mapper = resolver.mapper;
    this.imports = resolver.imports;
    this.invocations = new Map();
    for (const [key, f] of this.mapper.files) {
      this.invocations.set(key, this.getInvocations(f));
    }
  }

  /**
   * Extracts and resolves method invocations from a given Java file.
   *
   * @param file - The Java file to analyze for method invocations.
   * @returns An object containing resolved and unresolved method invocations.
   */
  getInvocations(file: JavaFile): Invocations {
    const variables = new Set(
      JAVA_VARIABLES_QUERY.captures(file.symbol.node).map((c) => c.node.text),
    );
    const captures = JAVA_INVOCATION_QUERY.captures(file.symbol.node).map((c) =>
      c.node.text
    );
    const resolvedImports = this.imports.get(file.path)!.resolved;
    const resolved = new Map<string, ConcreteNode>();
    const unresolved = new Set<string>();
    for (const c of captures) {
      // Check variables
      if (variables.has(c)) {
        continue;
      }
      // Check imports
      if (resolvedImports.has(c)) {
        resolved.set(c, resolvedImports.get(c)!);
      } else {
        // Check project
        const cnode = this.mapper.tree.getNode(c);
        if (cnode && cnode instanceof ConcreteNode) {
          resolved.set(c, cnode);
        } else {
          unresolved.add(c);
        }
      }
    }
    return { resolved, unresolved };
  }
}
