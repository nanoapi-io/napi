import { describe, expect, test } from "vitest";
import { NamespaceResolver } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../types";

describe("NamespaceResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsResolver: NamespaceResolver = new NamespaceResolver(files);

  test("2Namespaces1File.cs", () => {
    const file = files.get("2Namespaces1File.cs") as File;
    const namespaces = nsResolver.getNamespacesFromFile(file);
    expect(namespaces).toMatchObject([
      {
        name: "",
        classes: [],
        childrenNamespaces: [
          {
            name: "BeefBurger",
            classes: [
              { name: "Steak", filepath: "2Namespaces1File.cs" },
              { name: "Cheese", filepath: "2Namespaces1File.cs" },
              { name: "Bun", filepath: "2Namespaces1File.cs" },
            ],
            childrenNamespaces: [],
          },
          {
            name: "ChickenBurger",
            classes: [
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
        name: "",
        classes: [
          { name: "User", filepath: "Models.cs" },
          { name: "Order", filepath: "Models.cs" },
          { name: "OrderStatus", filepath: "Models.cs" },
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
        classes: [],
        childrenNamespaces: [
          {
            name: "MyNamespace",
            classes: [{ name: "MyClass", filepath: "Namespaced.cs" }],
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
        classes: [],
        childrenNamespaces: [
          {
            name: "OuterNamespace",
            classes: [{ name: "OuterClass", filepath: "Nested.cs" }],
            childrenNamespaces: [
              {
                name: "InnerNamespace",
                classes: [{ name: "InnerClass", filepath: "Nested.cs" }],
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
        classes: [
          { name: "Freeman", filepath: "SemiNamespaced.cs" },
          { name: "HeadCrab", filepath: "SemiNamespaced.cs" },
        ],
        childrenNamespaces: [
          {
            name: "HalfNamespace",
            classes: [{ name: "Gordon", filepath: "SemiNamespaced.cs" }],
            childrenNamespaces: [],
          },
        ],
      },
    ]);
  });
});
