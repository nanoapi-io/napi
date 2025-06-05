import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { JavaPackageMapper } from "./index.ts";
import { getJavaFilesMap } from "../testFiles/index.ts";

describe("Java Package Mapper", () => {
  const files = getJavaFilesMap();
  const mapper = new JavaPackageMapper(files);
  const tree = mapper.tree;

  test("maps the project correctly", () => {
    expect(Array.from(tree.children.keys())).toContain("io");
    expect(Array.from(tree.children.get("io")!.children.keys())).toContain(
      "nanoapi",
    );
    expect(
      Array.from(
        tree.children.get("io")!.children.get("nanoapi")!.children.keys(),
      ),
    )
      .toContain("testfiles");
    expect(
      Array.from(tree.children.get("io")!.children.get("nanoapi")!.children.get(
        "testfiles",
      )!.children.keys()),
    ).toContain("food");
    const food = tree.children.get("io")!.children.get("nanoapi")!.children.get(
      "testfiles",
    )!.children.get("food")!;
    const classes = Array.from(food.children.keys());
    expect(classes).toContain("Burger");
    expect(classes).toContain("Condiment");
    expect(classes).toContain("DoubleBurger");
    expect(classes).toContain("Food");
    expect(classes).toContain("Steak");
    expect(Array.from(food.children.get("Steak")!.children.keys())).toContain(
      "Tapeworm",
    );
  });

  test("finds nodes", () => {
    expect(tree.getNode("")).toBeDefined();
    expect(tree.getNode("io")).toBeDefined();
    expect(tree.getNode("io.nanoapi")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.App")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Burger")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Condiment")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.DoubleBurger"))
      .toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Food")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Steak")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Steak.Tapeworm"))
      .toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.Screws")).toBeUndefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.goron")).toBeDefined();
    expect(tree.getNode("io.nanoapi.testfiles.food.goron.Pebble"))
      .toBeDefined();
  });

  test("resolves imports", () => {
    const ioimport = tree.getImport("io.*");
    expect(ioimport).toBeDefined();
    if (!ioimport) {
      throw Error("dummy error, not supposed to happen");
    }
    expect(ioimport.size).toBe(0);
    const foodimport = tree.getImport("io.nanoapi.testfiles.food.*")!;
    expect(foodimport.size >= 5).toBe(true);
    expect(foodimport.get("goron")).toBeUndefined();
    expect(foodimport.get("Pebble")).toBeUndefined();
    const burgerimport = tree.getImport("io.nanoapi.testfiles.food.Burger")!;
    expect(burgerimport.size).toBe(1);

    expect(tree.getImport("io.nanoapi.testfiles")).toBeUndefined();
  });
});
