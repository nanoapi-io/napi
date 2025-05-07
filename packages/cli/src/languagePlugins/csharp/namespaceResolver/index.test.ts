import { describe, expect, test } from "vitest";
import { CSharpNamespaceResolver, type File } from "./index.ts";
import path from "node:path";
import { csharpFilesFolder, getCSharpFilesMap } from "../testFiles/index.ts";

describe("NamespaceResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsResolver: CSharpNamespaceResolver = new CSharpNamespaceResolver();

  test("2Namespaces1File.cs", () => {
    const file = files.get(
      path.join(csharpFilesFolder, "2Namespaces1File.cs"),
    ) as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "MyApp.BeefBurger",
            exports: [{ name: "Steak" }, { name: "Cheese" }, { name: "Bun" }],
            childrenNamespaces: [],
          },
          {
            name: "ChickenBurger",
            exports: [{ name: "Chicken" }, { name: "Salad" }, { name: "Bun" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });

  test("Models.cs", () => {
    const file = files.get(path.join(csharpFilesFolder, "Models.cs")) as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "MyApp.Models",
        exports: [
          { name: "User", type: "class" },
          { name: "Order", type: "struct" },
          { name: "OrderStatus", type: "enum" },
          { name: "IOrder", type: "interface" },
          { name: "OrderDelegate", type: "delegate" },
        ],
        childrenNamespaces: [],
      },
    ]);
  });

  test("Namespaced.cs", () => {
    const file = files.get(
      path.join(csharpFilesFolder, "Namespaced.cs"),
    ) as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "MyNamespace",
            exports: [{ name: "MyClass" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });

  test("Nested.cs", () => {
    const file = files.get(path.join(csharpFilesFolder, "Nested.cs")) as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [],
        childrenNamespaces: [
          {
            name: "OuterNamespace",
            exports: [
              { name: "OuterClass" },
              {
                name: "OuterInnerClass",
                parent: { name: "OuterClass" },
              },
            ],
            childrenNamespaces: [
              {
                name: "InnerNamespace",
                exports: [{ name: "InnerClass" }],
                childrenNamespaces: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  test("SemiNamespaced.cs", () => {
    const file = files.get(
      path.join(csharpFilesFolder, "SemiNamespaced.cs"),
    ) as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        exports: [{ name: "Freeman" }, { name: "HeadCrab" }],
        childrenNamespaces: [
          {
            name: "HalfNamespace",
            exports: [{ name: "Gordon" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });
});
