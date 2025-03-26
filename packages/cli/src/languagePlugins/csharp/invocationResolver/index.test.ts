import { describe, expect, test } from "vitest";
import { File } from "../namespaceResolver";
import { CSharpNamespaceMapper } from "../namespaceMapper";
import { getCSharpFilesMap } from "../testFiles";
import { CSharpInvocationResolver } from ".";

describe("DependencyResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);
  const depResolver: CSharpInvocationResolver = new CSharpInvocationResolver(
    nsMapper,
  );

  test("Import resolver", () => {
    const usedFiles = depResolver.getInvocationsFromFile("Program.cs");
    expect(usedFiles).toMatchObject({
      resolvedSymbols: [
        {
          name: "Bun",
          type: "class",
          filepath: "2Namespaces1File.cs",
          namespace: "BeefBurger",
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
          name: "OuterClass",
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
});
