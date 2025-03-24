import { describe, expect, test } from "vitest";
import { CSharpNamespaceResolver, File } from ".";
import { getCSharpFilesMap } from "../testFiles";

describe("NamespaceResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsResolver: CSharpNamespaceResolver = new CSharpNamespaceResolver();

  test("2Namespaces1File.cs", () => {
    const file = files.get("2Namespaces1File.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "BeefBurger",
            exports: [
              { name: "Steak", filepath: "2Namespaces1File.cs" },
              { name: "Cheese", filepath: "2Namespaces1File.cs" },
              { name: "Bun", filepath: "2Namespaces1File.cs" },
            ],
            childrenNamespaces: [],
          },
          {
            name: "ChickenBurger",
            exports: [
              { name: "Chicken", filepath: "2Namespaces1File.cs" },
              { name: "Salad", filepath: "2Namespaces1File.cs" },
              { name: "Bun", filepath: "2Namespaces1File.cs" },
            ],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });

  test("Models.cs", () => {
    const file = files.get("Models.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "MyApp.Models",
        exports: [
          { name: "User", type: "class", filepath: "Models.cs" },
          { name: "Order", type: "struct", filepath: "Models.cs" },
          { name: "OrderStatus", type: "enum", filepath: "Models.cs" },
          { name: "IOrder", type: "interface", filepath: "Models.cs" },
          { name: "OrderDelegate", type: "delegate", filepath: "Models.cs" },
        ],
        childrenNamespaces: [],
      },
    ]);
  });

  test("Namespaced.cs", () => {
    const file = files.get("Namespaced.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "MyNamespace",
            exports: [{ name: "MyClass", filepath: "Namespaced.cs" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });

  test("Nested.cs", () => {
    const file = files.get("Nested.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "OuterNamespace",
            exports: [{ name: "OuterClass", filepath: "Nested.cs" }],
            childrenNamespaces: [
              {
                name: "InnerNamespace",
                exports: [{ name: "InnerClass", filepath: "Nested.cs" }],
                childrenNamespaces: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  test("SemiNamespaced.cs", () => {
    const file = files.get("SemiNamespaced.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [
          { name: "Freeman", filepath: "SemiNamespaced.cs" },
          { name: "HeadCrab", filepath: "SemiNamespaced.cs" },
        ],
        childrenNamespaces: [
          {
            name: "HalfNamespace",
            exports: [{ name: "Gordon", filepath: "SemiNamespaced.cs" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });
});
