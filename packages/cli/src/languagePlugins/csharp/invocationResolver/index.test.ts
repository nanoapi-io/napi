import { describe, expect, test } from "vitest";
import { File } from "../namespaceResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import { CSharpNamespaceResolver } from "../namespaceResolver";
import { getCSharpFilesMap } from "../testFiles";
import { CSharpInvocationResolver } from ".";
import Parser from "tree-sitter";

describe("InvocationResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);
  const nsResolver = new CSharpNamespaceResolver();
  const invResolver: CSharpInvocationResolver = new CSharpInvocationResolver(
    nsMapper,
  );

  test("Invocation resolution", () => {
    const usedFiles = invResolver.getInvocationsFromFile("Program.cs");
    expect(usedFiles).toMatchObject({
      resolvedSymbols: [
        {
          name: "Bun",
          type: "class",
          filepath: "2Namespaces1File.cs",
          namespace: "MyApp.BeefBurger",
        },
        {
          name: "Bun",
          type: "class",
          filepath: "2Namespaces1File.cs",
          namespace: "ChickenBurger",
        },
        {
          name: "MyClass",
          type: "class",
          filepath: "Namespaced.cs",
          namespace: "MyNamespace",
        },
        {
          name: "Gordon",
          type: "class",
          filepath: "SemiNamespaced.cs",
          namespace: "HalfNamespace",
        },
        {
          name: "Freeman",
          type: "class",
          filepath: "SemiNamespaced.cs",
          namespace: "",
        },
        {
          name: "OuterInnerClass",
          type: "class",
          filepath: "Nested.cs",
          namespace: "OuterNamespace",
        },
        {
          name: "InnerClass",
          type: "class",
          filepath: "Nested.cs",
          namespace: "OuterNamespace.InnerNamespace",
        },
        {
          name: "OrderStatus",
          type: "enum",
          filepath: "Models.cs",
          namespace: "MyApp.Models",
        },
      ],
      unresolved: ["System.Math"],
    });
  });

  test("isUsedInFile", () => {
    const myclass: SymbolNode = {
      name: "MyClass",
      type: "class",
      filepath: "Namespaced.cs",
      namespace: "MyNamespace",
      node: {} as Parser.SyntaxNode,
    };
    const headcrab: SymbolNode = {
      name: "HeadCrab",
      type: "class",
      filepath: "SemiNamespaced.cs",
      namespace: "",
      node: {} as Parser.SyntaxNode,
    };
    expect(invResolver.isUsedInFile("Program.cs", myclass)).toBe(true);
    expect(invResolver.isUsedInFile("Program.cs", headcrab)).toBe(false);
  });

  test("Same-file dependencies", () => {
    const seminamespaced = nsResolver.getNamespacesFromFile(
      files.get("SemiNamespaced.cs") as File,
    );
    const headcrabnode = seminamespaced[0].exports.find(
      (exp) => exp.name === "HeadCrab",
    )?.node as Parser.SyntaxNode;
    const hcinvocations = invResolver.getInvocationsFromNode(
      headcrabnode,
      "SemiNamespaced.cs",
    );
    expect(hcinvocations).toMatchObject({
      resolvedSymbols: [
        {
          name: "Freeman",
          type: "class",
          filepath: "SemiNamespaced.cs",
          namespace: "",
        },
      ],
      unresolved: [],
    });
  });
});
