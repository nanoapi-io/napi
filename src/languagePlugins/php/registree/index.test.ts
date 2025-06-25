import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getPHPFilesMap } from "../testFiles/index.ts";
import { PHPRegistree } from "./index.ts";
import { SymbolNode } from "./types.ts";
import { LEARN_PHP, NESTED } from "../testFiles/constants.ts";

describe("PHP Registree", () => {
  const files = getPHPFilesMap();
  const registree = new PHPRegistree(files);

  test("builds a correct tree", () => {
    const tree = registree.tree;
    expect(tree.name).toBe("");
    expect(tree.children.get("All")).toBeDefined();
    const all = tree.children.get("All")!;
    expect(all.name).toBe("All");
    expect(all.children.size).toBe(2);
    expect(all.children.get("a")).toBeDefined();
    expect(all.children.get("a")! instanceof SymbolNode).toBe(true);
    expect((all.children.get("a")! as SymbolNode).symbols.length).toBe(1);
    expect(all.children.get("My")).toBeDefined();
    expect(all.children.get("My")!.children.get("Fellas")).toBeDefined();
    expect(tree.children.get("My")).toBeDefined();
    const my = tree.children.get("My")!;
    expect(my.name).toBe("My");
    expect(my.children.get("Namespace")).toBeDefined();
    const mynamespace = my.children.get("Namespace")!;
    expect(mynamespace.children.size).toBe(66);
  });

  test("builds a correct registry", () => {
    const registry = registree.registry;
    expect(registry.files.get(NESTED)).toBeDefined();
    expect(registry.files.get(LEARN_PHP)).toBeDefined();
    const nested = registry.files.get(NESTED)!;
    expect(nested.symbols.size).toBe(3);
    expect(Array.from(nested.symbols.keys())).toStrictEqual([
      "a",
      "m",
      "f",
    ]);
  });
});
