import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getJavaFilesMap } from "../testFiles/index.ts";
import {
  BURGER,
  CONDIMENT,
  DOUBLEBURGER,
  FOOD,
  STEAK,
} from "../testFiles/constants.ts";
import { JavaPackageResolver } from "./index.ts";
import type { JavaClass } from "./types.ts";

describe("Java Package Resolver", () => {
  const files = getJavaFilesMap();
  const condiment = files.get(CONDIMENT)!;
  const food = files.get(FOOD)!;
  const steak = files.get(STEAK)!;
  const burger = files.get(BURGER)!;
  const doubleburger = files.get(DOUBLEBURGER)!;
  const packageResolver = new JavaPackageResolver();

  test("parses Food.java", () => {
    const result = packageResolver.resolveFile(food)!;
    expect(result).toBeDefined();
    expect(result.path).toStrictEqual(FOOD);
    expect(result.package).toBe("io.nanoapi.testfiles.food");
    expect(result.imports.length).toBe(0);
    const symbol = result.symbol as JavaClass;
    expect(symbol).toBeDefined();
    expect(symbol.name).toBe("Food");
    expect(symbol.type).toBe("interface");
    expect(symbol.modifiers).toContain("public");
    expect(symbol.modifiers.length).toBe(1);
    expect(symbol.typeParamCount).toBe(0);
    expect(symbol.superclass).toBeUndefined();
    expect(symbol.interfaces.length).toBe(0);
    expect(symbol.children.length).toBe(0);
  });

  test("parses Condiment.java", () => {
    const result = packageResolver.resolveFile(condiment)!;
    expect(result).toBeDefined();
    expect(result.path).toStrictEqual(CONDIMENT);
    expect(result.package).toBe("io.nanoapi.testfiles.food");
    expect(result.imports.length).toBe(0);
    const symbol = result.symbol as JavaClass;
    expect(symbol).toBeDefined();
    expect(symbol.name).toBe("Condiment");
    expect(symbol.type).toBe("enum");
    expect(symbol.modifiers).toContain("public");
    expect(symbol.modifiers.length).toBe(1);
    expect(symbol.typeParamCount).toBe(0);
    expect(symbol.superclass).toBeUndefined();
    expect(symbol.interfaces.length).toBe(0);
    expect(symbol.children.length).toBe(0);
  });

  test("parses Steak.java", () => {
    const result = packageResolver.resolveFile(steak)!;
    expect(result).toBeDefined();
    expect(result.path).toStrictEqual(STEAK);
    expect(result.package).toBe("io.nanoapi.testfiles.food");
    expect(result.imports.length).toBe(0);
    const symbol = result.symbol as JavaClass;
    expect(symbol).toBeDefined();
    expect(symbol.name).toBe("Steak");
    expect(symbol.type).toBe("class");
    expect(symbol.modifiers).toContain("public");
    expect(symbol.modifiers.length).toBe(1);
    expect(symbol.typeParamCount).toBe(0);
    expect(symbol.superclass).toBeUndefined();
    expect(symbol.interfaces.length).toBe(1);
    expect(symbol.interfaces[0]).toBe("Food");
    expect(symbol.children.length).toBe(1);
    const child = symbol.children[0] as JavaClass;
    expect(child).toBeDefined();
    expect(child.name).toBe("Tapeworm");
    expect(child.type).toBe("class");
    expect(child.modifiers).toContain("private");
    expect(child.modifiers).toContain("static");
    expect(child.modifiers.length).toBe(2);
    expect(child.typeParamCount).toBe(0);
    expect(child.superclass).toBeUndefined();
    expect(child.interfaces.length).toBe(0);
    expect(child.children.length).toBe(0);
  });

  test("parses Burger.java", () => {
    const result = packageResolver.resolveFile(burger)!;
    expect(result).toBeDefined();
    expect(result.path).toStrictEqual(BURGER);
    expect(result.package).toBe("io.nanoapi.testfiles.food");
    expect(result.imports.length).toBe(2);
    const symbol = result.symbol as JavaClass;
    expect(symbol).toBeDefined();
    expect(symbol.name).toBe("Burger");
    expect(symbol.type).toBe("class");
    expect(symbol.typeParamCount).toBe(1);
    expect(symbol.superclass).toBeUndefined();
    expect(symbol.interfaces.length).toBe(1);
    expect(symbol.children.length).toBe(2);
    expect(symbol.children.filter((c) => c.name === "restaurantCount"))
      .toHaveLength(1);
    expect(symbol.children.filter((c) => c.type === "field")).toHaveLength(1);
    expect(symbol.children.filter((c) => c.name === "advertisement"))
      .toHaveLength(1);
    expect(symbol.children.filter((c) => c.type === "method")).toHaveLength(1);
  });

  test("parses DoubleBurger.java", () => {
    const result = packageResolver.resolveFile(doubleburger)!;
    expect(result).toBeDefined();
    expect(result.path).toStrictEqual(DOUBLEBURGER);
    expect(result.package).toBe("io.nanoapi.testfiles.food");
    const symbol = result.symbol as JavaClass;
    expect(symbol).toBeDefined();
    expect(symbol.name).toBe("DoubleBurger");
    expect(symbol.type).toBe("class");
    expect(symbol.typeParamCount).toBe(2);
    expect(symbol.superclass).toBeDefined();
    expect(symbol.superclass).toBe("Burger");
    expect(symbol.interfaces.length).toBe(0);
  });
});
