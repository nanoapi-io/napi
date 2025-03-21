import { describe, expect, test } from "vitest";
import { CSharpPlugin } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "./types";

describe("CSharpPlugin", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const plugin: CSharpPlugin = new CSharpPlugin(files);
  const programcs: File = files.get("Program.cs") as File;

  test("2Namespaces1File.cs", () => {
    const file = files.get("2Namespaces1File.cs") as File;
    const namespaces = plugin.getNamespacesFromFile(file);
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
    const namespaces = plugin.getNamespacesFromFile(file);
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
    const namespaces = plugin.getNamespacesFromFile(file);
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
    const namespaces = plugin.getNamespacesFromFile(file);
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
    const namespaces = plugin.getNamespacesFromFile(file);
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
  test("Import resolver", () => {
    const usedFiles = plugin.getDependenciesFromFile(
      plugin.buildNamespaceTree(),
      programcs,
    );
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
        namespace: "InnerNamespace",
      },
      {
        name: "OrderStatus",
        filepath: "Models.cs",
        namespace: "",
      },
    ]);
  });
});
