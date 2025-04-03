import { describe, test, expect } from "vitest";
import { CSharpNamespaceMapper } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("NamespaceMapper", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);

  test("should build a namespace tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();
    expect(nsTree).toMatchObject({
      name: "",
      exports: [
        { name: "Freeman", filepath: "SemiNamespaced.cs" },
        { name: "HeadCrab", filepath: "SemiNamespaced.cs" },
        { name: "Usage", filepath: "Usage.cs" },
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
          name: "MyApp",
          exports: [],
          childrenNamespaces: [
            {
              name: "Models",
              exports: [
                { name: "User", filepath: "Models.cs" },
                { name: "Order", filepath: "Models.cs" },
                { name: "OrderStatus", filepath: "Models.cs" },
                { name: "IOrder", filepath: "Models.cs" },
                { name: "OrderDelegate", filepath: "Models.cs" },
              ],
              childrenNamespaces: [],
            },
          ],
        },
        {
          name: "MyNamespace",
          exports: [{ name: "MyClass", filepath: "Namespaced.cs" }],
          childrenNamespaces: [],
        },
        {
          name: "OuterNamespace",
          exports: [
            { name: "OuterClass", filepath: "Nested.cs" },
            { name: "OuterInnerClass", filepath: "Nested.cs" },
          ],
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

  test("Finds classes accurately in the tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();
    const order = nsMapper.findClassInTree(nsTree, "Order");
    expect(order).toMatchObject({
      name: "Order",
      filepath: "Models.cs",
    });
    const innerClass = nsMapper.findClassInTree(nsTree, "InnerClass");
    expect(innerClass).toMatchObject({
      name: "InnerClass",
      filepath: "Nested.cs",
    });
    const chickenbun = nsMapper.findClassInTree(nsTree, "ChickenBurger.Bun");
    expect(chickenbun).toMatchObject({
      name: "Bun",
      filepath: "2Namespaces1File.cs",
    });
  });

  test("Finds namespaces accurately in the tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();
    const myapp = nsMapper.findNamespaceInTree(nsTree, "MyApp");
    expect(myapp).toMatchObject({
      name: "MyApp",
      exports: [],
      childrenNamespaces: [
        {
          name: "Models",
          exports: expect.any(Array),
          childrenNamespaces: expect.any(Array),
        },
      ],
    });
    const halfnamespace = nsMapper.findNamespaceInTree(nsTree, "HalfNamespace");
    expect(halfnamespace).toMatchObject({
      name: "HalfNamespace",
      exports: [{ name: "Gordon", filepath: "SemiNamespaced.cs" }],
      childrenNamespaces: [],
    });
    const models = nsMapper.findNamespaceInTree(nsTree, "MyApp.Models");
    expect(models).toMatchObject({
      name: "Models",
      exports: expect.any(Array),
      childrenNamespaces: expect.any(Array),
    });
    const innernamespace = nsMapper.findNamespaceInTree(
      nsTree,
      "OuterNamespace.InnerNamespace",
    );
    expect(innernamespace).toMatchObject({
      name: "InnerNamespace",
      exports: [{ name: "InnerClass", filepath: "Nested.cs" }],
      childrenNamespaces: [],
    });
  });

  // test("should save the debug tree to a file", () => {
  //   const debugTree = nsMapper.saveDebugTree("debugTree.json");
  //   expect(debugTree).toMatchObject({
  //     name: "",
  //     type: "namespace",
  //     children: expect.any(Array),
  //   });
  //   expect(debugTree.children.length > 0).toBe(true);
  // });
});
