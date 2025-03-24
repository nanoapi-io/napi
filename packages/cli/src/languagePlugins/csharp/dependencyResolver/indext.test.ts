import { describe, expect, test } from "vitest";
import { NamespaceResolver, File } from "../namespaceResolver";
import { getCSharpFilesMap } from "../testFiles";
import { DependencyResolver } from ".";

describe("DependencyResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsResolver: NamespaceResolver = new NamespaceResolver(files);
  const depResolver: DependencyResolver = new DependencyResolver(nsResolver);
  const programcs: File = files.get("Program.cs") as File;

  test("Import resolver", () => {
    const usedFiles = depResolver.getDependenciesFromFile(programcs);
    expect(usedFiles).toMatchObject([
      {
        name: "Bun",
        filepath: "2Namespaces1File.cs",
        namespace: "BeefBurger",
      },
      {
        name: "Bun",
        filepath: "2Namespaces1File.cs",
        namespace: "ChickenBurger",
      },
      {
        name: "MyClass",
        filepath: "Namespaced.cs",
        namespace: "MyNamespace",
      },
      {
        name: "Gordon",
        filepath: "SemiNamespaced.cs",
        namespace: "HalfNamespace",
      },
      {
        name: "Freeman",
        filepath: "SemiNamespaced.cs",
        namespace: "",
      },
      {
        name: "OuterClass",
        filepath: "Nested.cs",
        namespace: "OuterNamespace",
      },
      {
        name: "InnerClass",
        filepath: "Nested.cs",
        namespace: "OuterNamespace.InnerNamespace",
      },
      {
        name: "OrderStatus",
        filepath: "Models.cs",
        namespace: "",
      },
    ]);
  });
});
