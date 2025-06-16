import type Parser from "tree-sitter";
import { JavaClass, type JavaFile, type SymbolType } from "./types.ts";
import { JAVA_PROGRAM_QUERY } from "./queries.ts";
import { javaParser } from "../../../helpers/treeSitter/parsers.ts";

/**
 * Resolves Java package and import information from a parsed Java file.
 */
export class JavaPackageResolver {
  /**
   * The Tree-sitter parser instance for Java.
   */
  parser: Parser = javaParser;

  /**
   * Resolves the package, imports, and main declaration of a Java file.
   *
   * @param file - An object containing the file path and the root syntax node of the parsed Java file.
   * @returns A JavaFile object containing the file's path, root node, package name, imports, and main symbol declaration.
   * @throws Will throw an error if no declaration is found in the file.
   */
  resolveFile(file: {
    path: string;
    rootNode: Parser.SyntaxNode;
  }): JavaFile {
    const captures = JAVA_PROGRAM_QUERY.captures(file.rootNode);
    const packagename = captures.find((c) => c.name === "package")?.node.text ??
      "";
    const imports = captures.filter((c) => c.name === "import").map((c) =>
      // Unholy string manipulation because wildcard imports break tree-sitter queries.
      c.node.text.split(" ").findLast((s) => s.length > 0 && s !== ";")!
        .replace(";", "")
    );
    const declaration = captures.find((c) =>
      !["package", "import"].includes(c.name)
    );
    if (!declaration) {
      throw Error(`No declaration found for ${file.path}`);
    }
    const symbol = new JavaClass(
      declaration.node,
      declaration.name as SymbolType,
      file.path,
    );
    return {
      path: file.path,
      rootNode: file.rootNode,
      symbol,
      package: packagename,
      imports,
    };
  }
}
