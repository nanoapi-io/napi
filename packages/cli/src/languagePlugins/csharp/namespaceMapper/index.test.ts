import { describe, test, expect } from "vitest";
import { NamespaceMapper } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("NamespaceMapper", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsMapper = new NamespaceMapper(files);

  test("should build a namespace tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();
    expect(nsTree).toMatchObject({
      name: "",
      exports: [
        { name: "User", type: "class", filepath: "Models.cs" },
        { name: "Order", type: "struct", filepath: "Models.cs" },
        { name: "OrderStatus", type: "enum", filepath: "Models.cs" },
        { name: "IOrder", type: "interface", filepath: "Models.cs" },
        { name: "OrderDelegate", type: "delegate", filepath: "Models.cs" },
        { name: "Freeman", filepath: "SemiNamespaced.cs" },
        { name: "HeadCrab", filepath: "SemiNamespaced.cs" },
      ],
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
        {
          name: "MyNamespace",
          exports: [{ name: "MyClass", filepath: "Namespaced.cs" }],
          childrenNamespaces: [],
        },
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
        {
          name: "Tests",
          exports: [{ name: "Program", filepath: "Program.cs" }],
          childrenNamespaces: [],
        },
        {
          name: "HalfNamespace",
          exports: [{ name: "Gordon", filepath: "SemiNamespaced.cs" }],
          childrenNamespaces: [],
        },
      ],
    });
  });
});
