import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CSharpNamespaceMapper } from "./index.ts";
import { csharpFilesFolder, getCSharpFilesMap } from "../testFiles/index.ts";
import { join } from "@std/path";
import type { File } from "../namespaceResolver/index.ts";

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
          filepath: join(csharpFilesFolder, "SemiNamespaced.cs"),
        }),
        expect.objectContaining({
          name: "HeadCrab",
          filepath: join(csharpFilesFolder, "SemiNamespaced.cs"),
        }),
        expect.objectContaining({
          name: "Usage",
          filepath: join(csharpFilesFolder, "Usage.cs"),
        }),
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
    expect(beefBurgerNs.exports).toHaveLength(4);
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
      filepath: join(csharpFilesFolder, "Models.cs"),
    });
    const innerClass = nsMapper.findClassInTree(nsTree, "InnerClass");
    expect(innerClass).toMatchObject({
      name: "InnerClass",
      filepath: join(csharpFilesFolder, "Nested.cs"),
    });
    const chickenbun = nsMapper.findClassInTree(nsTree, "ChickenBurger.Bun");
    expect(chickenbun).toMatchObject({
      name: "Bun",
      filepath: join(csharpFilesFolder, "2Namespaces1File.cs"),
    });
  });

  test("Finds namespaces accurately in the tree", () => {
    const nsTree = nsMapper.buildNamespaceTree();
    const myapp = nsMapper.findNamespaceInTree(nsTree, "MyApp");
    expect(myapp).toBeDefined();
    if (!myapp) return;
    expect(myapp.childrenNamespaces.length).toBe(2);
    const halfnamespace = nsMapper.findNamespaceInTree(nsTree, "HalfNamespace");
    expect(halfnamespace).toMatchObject({
      name: "HalfNamespace",
      exports: [{ name: "Gordon" }],
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
      exports: [{ name: "InnerClass" }],
      childrenNamespaces: [],
    });
  });
});
