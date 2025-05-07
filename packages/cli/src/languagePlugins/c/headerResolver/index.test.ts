import { describe, test, expect } from "vitest";
import { getCFilesMap, cFilesFolder } from "../testFiles/index.js";
import { CHeaderResolver } from "./index.js";
import path from "path";

describe("CHeaderResolver", () => {
  const cFilesMap = getCFilesMap();
  const resolver = new CHeaderResolver();
  const burgers = path.join(cFilesFolder, "burgers.h");

  test("should resolve symbols in C header files", () => {
    const file = cFilesMap.get(burgers);
    if (!file) {
      throw new Error(`File not found: ${burgers}`);
    }
    const exportedSymbols = resolver.resolveSymbols(file);
    expect(exportedSymbols).toHaveLength(10);
    const condiment = exportedSymbols.find(
      (symbol) => symbol.name === "Condiment",
    );
    expect(condiment).toBeDefined();
    expect(condiment.type).toBe("enum");
    expect(condiment.specifiers).toEqual([]);
    expect(condiment.qualifiers).toEqual([]);
    expect(condiment.node.type).toBe("enum_specifier");
    expect(condiment.identifierNode.type).toBe("type_identifier");
    expect(condiment.filepath).toBe(burgers);

    const classicsauces = exportedSymbols.find(
      (symbol) => symbol.name === "ClassicSauces",
    );
    expect(classicsauces).toBeDefined();
    expect(classicsauces.type).toBe("enum");

    const sauce = exportedSymbols.find((symbol) => symbol.name === "Sauce");
    expect(sauce).toBeDefined();
    expect(sauce.type).toBe("union");
    expect(sauce.specifiers).toEqual([]);
    expect(sauce.qualifiers).toEqual([]);
    expect(sauce.node.type).toBe("union_specifier");
    expect(sauce.identifierNode.type).toBe("type_identifier");
    expect(sauce.filepath).toBe(burgers);

    const burger = exportedSymbols.find((symbol) => symbol.name === "Burger");
    expect(burger).toBeDefined();
    expect(burger.type).toBe("struct");
    expect(burger.specifiers).toEqual([]);
    expect(burger.qualifiers).toEqual([]);
    expect(burger.node.type).toBe("struct_specifier");
    expect(burger.identifierNode.type).toBe("type_identifier");
    expect(burger.filepath).toBe(burgers);

    const classicburger = exportedSymbols.find(
      (symbol) => symbol.name === "classicBurger",
    );
    expect(classicburger).toBeDefined();
    expect(classicburger.type).toBe("variable");
    expect(classicburger.specifiers).toEqual([]);
    expect(classicburger.qualifiers).toEqual(["const"]);
    expect(classicburger.node.type).toBe("declaration");
    expect(classicburger.identifierNode.type).toBe("identifier");
    expect(classicburger.filepath).toBe(burgers);

    const burger_count = exportedSymbols.find(
      (symbol) => symbol.name === "burger_count",
    );
    expect(burger_count).toBeDefined();
    expect(burger_count.type).toBe("variable");
    expect(burger_count.specifiers).toEqual(["static"]);
    expect(burger_count.qualifiers).toEqual([]);
    expect(burger_count.node.type).toBe("declaration");
    expect(burger_count.identifierNode.type).toBe("identifier");
    expect(burger_count.filepath).toBe(burgers);

    const function_names = exportedSymbols
      .filter((symbol) => symbol.type === "function")
      .map((symbol) => symbol.name);
    expect(function_names).toHaveLength(4);
    expect(function_names).toContain("get_burger_by_id");
    expect(function_names).toContain("get_cheapest_burger");
    expect(function_names).toContain("create_burger");
    expect(function_names).toContain("destroy_burger");
  });
});
