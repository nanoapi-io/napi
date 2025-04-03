import { describe, test, expect } from "vitest";
import { CSharpNamespaceMapper } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("NamespaceMapper", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);

  test("should build a namespace tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();

    // Check root namespace
    expect(nsTree.name).toBe("");
    expect(nsTree.exports).toHaveLength(3);
    expect(nsTree.childrenNamespaces).toHaveLength(6);

    // Check exports in root namespace
    expect(nsTree.exports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Freeman",
          filepath: "SemiNamespaced.cs",
        }),
        expect.objectContaining({
          name: "HeadCrab",
          filepath: "SemiNamespaced.cs",
        }),
        expect.objectContaining({ name: "Usage", filepath: "Usage.cs" }),
      ]),
    );

    // Check ChickenBurger namespace
    const chickenBurgerNs = nsTree.childrenNamespaces.find(
      (ns) => ns.name === "ChickenBurger",
    );
    expect(chickenBurgerNs).toBeDefined();
    if (!chickenBurgerNs) return;
    expect(chickenBurgerNs.exports).toHaveLength(3);
    expect(chickenBurgerNs.childrenNamespaces).toHaveLength(0);

    // Check MyApp namespace
    const myAppNs = nsTree.childrenNamespaces.find((ns) => ns.name === "MyApp");
    expect(myAppNs).toBeDefined();
    if (!myAppNs) return;
    expect(myAppNs.exports).toHaveLength(0);
    expect(myAppNs.childrenNamespaces).toHaveLength(2);

    // Check Models namespace under MyApp
    const modelsNs = myAppNs.childrenNamespaces.find(
      (ns) => ns.name === "Models",
    );
    expect(modelsNs).toBeDefined();
    if (!modelsNs) return;
    expect(modelsNs.exports).toHaveLength(5);
    expect(modelsNs.childrenNamespaces).toHaveLength(0);

    // Check BeefBurger namespace under MyApp
    const beefBurgerNs = myAppNs.childrenNamespaces.find(
      (ns) => ns.name === "BeefBurger",
    );
    expect(beefBurgerNs).toBeDefined();
    if (!beefBurgerNs) return;
    expect(beefBurgerNs.exports).toHaveLength(3);
    expect(beefBurgerNs.childrenNamespaces).toHaveLength(0);

    // Check MyNamespace namespace
    const myNamespaceNs = nsTree.childrenNamespaces.find(
      (ns) => ns.name === "MyNamespace",
    );
    expect(myNamespaceNs).toBeDefined();
    if (!myNamespaceNs) return;
    expect(myNamespaceNs.exports).toHaveLength(1);
    expect(myNamespaceNs.childrenNamespaces).toHaveLength(0);

    // Check OuterNamespace namespace
    const outerNamespaceNs = nsTree.childrenNamespaces.find(
      (ns) => ns.name === "OuterNamespace",
    );
    expect(outerNamespaceNs).toBeDefined();
    if (!outerNamespaceNs) return;
    expect(outerNamespaceNs.exports).toHaveLength(2);
    expect(outerNamespaceNs.childrenNamespaces).toHaveLength(1);

    // Check InnerNamespace under OuterNamespace
    const innerNamespaceNs = outerNamespaceNs.childrenNamespaces.find(
      (ns) => ns.name === "InnerNamespace",
    );
    expect(innerNamespaceNs).toBeDefined();
    if (!innerNamespaceNs) return;
    expect(innerNamespaceNs.exports).toHaveLength(1);
    expect(innerNamespaceNs.childrenNamespaces).toHaveLength(0);

    // Check Tests namespace
    const testsNs = nsTree.childrenNamespaces.find((ns) => ns.name === "Tests");
    expect(testsNs).toBeDefined();
    if (!testsNs) return;
    expect(testsNs.exports).toHaveLength(1);
    expect(testsNs.childrenNamespaces).toHaveLength(0);

    // Check HalfNamespace namespace
    const halfNamespaceNs = nsTree.childrenNamespaces.find(
      (ns) => ns.name === "HalfNamespace",
    );
    expect(halfNamespaceNs).toBeDefined();
    if (!halfNamespaceNs) return;
    expect(halfNamespaceNs.exports).toHaveLength(1);
    expect(halfNamespaceNs.childrenNamespaces).toHaveLength(0);
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
        {
          name: "BeefBurger",
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
