import { describe, test, expect } from "vitest";
import { getCFilesMap, cFilesFolder } from "../testFiles/index.js";
import { CHeaderResolver } from "./index.js";
import path from "path";

describe("CHeaderResolver", () => {
  const cFilesMap = getCFilesMap();
  const resolver = new CHeaderResolver();
  const burgers = path.join(cFilesFolder, "burgers.h");
  const file = cFilesMap.get(burgers);
  if (!file) {
    throw new Error(`File not found: ${burgers}`);
  }
  const exportedSymbols = resolver.resolveSymbols(file);

  test("should resolve symbols in C header files", () => {
    expect(exportedSymbols).toHaveLength(16);
  });

  test("resolves structs", () => {
    const burger = exportedSymbols.find((symbol) => symbol.name === "Burger");
    expect(burger).toBeDefined();
    expect(burger.type).toBe("struct");
    expect(burger.specifiers).toEqual([]);
    expect(burger.qualifiers).toEqual([]);
    expect(burger.node.type).toBe("struct_specifier");
    expect(burger.identifierNode.type).toBe("type_identifier");
    expect(burger.filepath).toBe(burgers);
  });

  test("resolves unions", () => {
    const sauce = exportedSymbols.find((symbol) => symbol.name === "Sauce");
    expect(sauce).toBeDefined();
    expect(sauce.type).toBe("union");
    expect(sauce.specifiers).toEqual([]);
    expect(sauce.qualifiers).toEqual([]);
    expect(sauce.node.type).toBe("union_specifier");
    expect(sauce.identifierNode.type).toBe("type_identifier");
    expect(sauce.filepath).toBe(burgers);
  });

  test("resolves enums", () => {
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

    const drink_t = exportedSymbols.find((symbol) => symbol.name === "Drink_t");
    expect(drink_t).toBeDefined();
    expect(drink_t.type).toBe("enum");
    expect(drink_t.specifiers).toEqual([]);
    expect(drink_t.qualifiers).toEqual([]);
    expect(drink_t.node.type).toBe("enum_specifier");
    expect(drink_t.identifierNode.type).toBe("type_identifier");
    expect(drink_t.filepath).toBe(burgers);
  });

  test("resolves variables and constant macros", () => {
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

    const burgers_h = exportedSymbols.find(
      (symbol) => symbol.name === "BURGERS_H",
    );
    expect(burgers_h).toBeDefined();
    expect(burgers_h.type).toBe("variable");
    expect(burgers_h.specifiers).toEqual([]);
    expect(burgers_h.qualifiers).toEqual([]);
    expect(burgers_h.node.type).toBe("preproc_def");
    expect(burgers_h.identifierNode.type).toBe("identifier");
    expect(burgers_h.filepath).toBe(burgers);

    const max_burgers = exportedSymbols.find(
      (symbol) => symbol.name === "MAX_BURGERS",
    );
    expect(max_burgers).toBeDefined();
    expect(max_burgers.type).toBe("variable");
    expect(max_burgers.specifiers).toEqual([]);
    expect(max_burgers.qualifiers).toEqual([]);
    expect(max_burgers.node.type).toBe("preproc_def");
    expect(max_burgers.identifierNode.type).toBe("identifier");
    expect(max_burgers.filepath).toBe(burgers);
  });

  test("resolves functions and macros", () => {
    const function_names = exportedSymbols
      .filter((symbol) => symbol.type === "function")
      .map((symbol) => symbol.name);
    expect(function_names).toHaveLength(5);
    expect(function_names).toContain("get_burger_by_id");
    expect(function_names).toContain("get_cheapest_burger");
    expect(function_names).toContain("create_burger");
    expect(function_names).toContain("destroy_burger");
    expect(function_names).toContain("MAX");

    const max_macro = exportedSymbols.find((symbol) => symbol.name === "MAX");
    expect(max_macro).toBeDefined();
    expect(max_macro.type).toBe("function");
    expect(max_macro.specifiers).toEqual([]);
    expect(max_macro.qualifiers).toEqual([]);
    expect(max_macro.node.type).toBe("preproc_function_def");
    expect(max_macro.identifierNode.type).toBe("identifier");
    expect(max_macro.filepath).toBe(burgers);
  });

  test("resolves typedefs", () => {
    const fries = exportedSymbols.find((symbol) => symbol.name === "Fries");
    expect(fries).toBeDefined();
    expect(fries.type).toBe("typedef");
    expect(fries.specifiers).toEqual([]);
    expect(fries.qualifiers).toEqual([]);
    expect(fries.node.type).toBe("type_definition");
    expect(fries.identifierNode.type).toBe("type_identifier");
    expect(fries.filepath).toBe(burgers);

    const drink = exportedSymbols.find((symbol) => symbol.name === "Drink");
    expect(drink).toBeDefined();
    expect(drink.type).toBe("typedef");
    expect(drink.specifiers).toEqual([]);
    expect(drink.qualifiers).toEqual([]);
    expect(drink.node.type).toBe("type_definition");
    expect(drink.identifierNode.type).toBe("type_identifier");
    expect(drink.filepath).toBe(burgers);
  });
});
