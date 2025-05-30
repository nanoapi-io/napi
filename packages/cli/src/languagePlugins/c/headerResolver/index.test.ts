import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CHeaderResolver } from "./index.ts";
import { join } from "@std/path";

describe("CHeaderResolver", () => {
  const cFilesMap = getCFilesMap();
  const resolver = new CHeaderResolver();
  const burgers = join(cFilesFolder, "burgers.h");
  const crashcases = join(cFilesFolder, "crashcases.h");
  const errorsh = join(cFilesFolder, "errors.h");
  const oldmanh = join(cFilesFolder, "oldman.h");
  const file = cFilesMap.get(burgers);
  if (!file) {
    throw new Error(`File not found: ${burgers}`);
  }
  const ccfile = cFilesMap.get(crashcases);
  if (!ccfile) {
    throw new Error(`File not found: ${crashcases}`);
  }
  const errorsfile = cFilesMap.get(errorsh);
  if (!errorsfile) {
    throw new Error(`File not found: ${errorsh}`);
  }
  const exportedSymbols = resolver.resolveSymbols(file);

  test("should resolve symbols in C header files", () => {
    expect(exportedSymbols).toHaveLength(16);
  });

  test("resolves structs", () => {
    const burger = exportedSymbols.find((symbol) => symbol.name === "Burger");
    expect(burger).toBeDefined();
    if (!burger) {
      throw new Error("burger is undefined");
    }
    expect(burger.type).toBe("struct");
    expect(burger.specifiers).toEqual([]);
    expect(burger.qualifiers).toEqual([]);
    expect(burger.node.type).toBe("struct_specifier");
    if (!burger.identifierNode) {
      throw new Error("burger.identifierNode is undefined");
    }
    expect(burger.identifierNode.type).toBe("type_identifier");
    expect(burger.filepath).toBe(burgers);
  });

  test("resolves unions", () => {
    const sauce = exportedSymbols.find((symbol) => symbol.name === "Sauce");
    expect(sauce).toBeDefined();
    if (!sauce) {
      throw new Error("sauce is undefined");
    }
    expect(sauce.type).toBe("union");
    expect(sauce.specifiers).toEqual([]);
    expect(sauce.qualifiers).toEqual([]);
    expect(sauce.node.type).toBe("union_specifier");
    if (!sauce.identifierNode) {
      throw new Error("sauce.identifierNode is undefined");
    }
    expect(sauce.identifierNode.type).toBe("type_identifier");
    expect(sauce.filepath).toBe(burgers);
  });

  test("resolves enums", () => {
    const condiment = exportedSymbols.find(
      (symbol) => symbol.name === "Condiment",
    );
    expect(condiment).toBeDefined();
    if (!condiment) {
      throw new Error("condiment is undefined");
    }
    expect(condiment.type).toBe("enum");
    expect(condiment.specifiers).toEqual([]);
    expect(condiment.qualifiers).toEqual([]);
    expect(condiment.node.type).toBe("enum_specifier");
    if (!condiment.identifierNode) {
      throw new Error("condiment.identifierNode is undefined");
    }
    expect(condiment.identifierNode.type).toBe("type_identifier");
    expect(condiment.filepath).toBe(burgers);

    const classicsauces = exportedSymbols.find(
      (symbol) => symbol.name === "ClassicSauces",
    );
    expect(classicsauces).toBeDefined();
    if (!classicsauces) {
      throw new Error("classicsauces is undefined");
    }
    expect(classicsauces.type).toBe("enum");

    const drink_t = exportedSymbols.find((symbol) => symbol.name === "Drink_t");
    expect(drink_t).toBeDefined();
    if (!drink_t) {
      throw new Error("drink_t is undefined");
    }
    expect(drink_t.type).toBe("enum");
    expect(drink_t.specifiers).toEqual([]);
    expect(drink_t.qualifiers).toEqual([]);
    expect(drink_t.node.type).toBe("enum_specifier");
    if (!drink_t.identifierNode) {
      throw new Error("drink_t.identifierNode is undefined");
    }
    expect(drink_t.identifierNode.type).toBe("type_identifier");
    expect(drink_t.filepath).toBe(burgers);
  });

  test("resolves variables", () => {
    const classicburger = exportedSymbols.find(
      (symbol) => symbol.name === "classicBurger",
    );
    expect(classicburger).toBeDefined();
    if (!classicburger) {
      throw new Error("classicburger is undefined");
    }
    expect(classicburger.type).toBe("variable");
    expect(classicburger.specifiers).toEqual([]);
    expect(classicburger.qualifiers).toEqual(["const"]);
    expect(classicburger.node.type).toBe("declaration");
    if (!classicburger.identifierNode) {
      throw new Error("classicburger.identifierNode is undefined");
    }
    expect(classicburger.identifierNode.type).toBe("identifier");
    expect(classicburger.filepath).toBe(burgers);

    const burger_count = exportedSymbols.find(
      (symbol) => symbol.name === "burger_count",
    );
    expect(burger_count).toBeDefined();
    if (!burger_count) {
      throw new Error("burger_count is undefined");
    }
    expect(burger_count.type).toBe("variable");
    expect(burger_count.specifiers).toEqual(["static"]);
    expect(burger_count.qualifiers).toEqual([]);
    expect(burger_count.node.type).toBe("declaration");
    if (!burger_count.identifierNode) {
      throw new Error("burger_count.identifierNode is undefined");
    }
    expect(burger_count.identifierNode.type).toBe("identifier");
    expect(burger_count.filepath).toBe(burgers);
  });

  test("resolves macro constants", () => {
    const burgers_h = exportedSymbols.find(
      (symbol) => symbol.name === "BURGERS_H",
    );
    expect(burgers_h).toBeDefined();
    if (!burgers_h) {
      throw new Error("burgers_h is undefined");
    }
    expect(burgers_h.type).toBe("macro_constant");
    expect(burgers_h.specifiers).toEqual([]);
    expect(burgers_h.qualifiers).toEqual([]);
    expect(burgers_h.node.type).toBe("preproc_def");
    if (!burgers_h.identifierNode) {
      throw new Error("burgers_h.identifierNode is undefined");
    }
    expect(burgers_h.identifierNode.type).toBe("identifier");
    expect(burgers_h.filepath).toBe(burgers);

    const max_burgers = exportedSymbols.find(
      (symbol) => symbol.name === "MAX_BURGERS",
    );
    expect(max_burgers).toBeDefined();
    if (!max_burgers) {
      throw new Error("max_burgers is undefined");
    }
    expect(max_burgers.type).toBe("macro_constant");
    expect(max_burgers.specifiers).toEqual([]);
    expect(max_burgers.qualifiers).toEqual([]);
    expect(max_burgers.node.type).toBe("preproc_def");
    if (!max_burgers.identifierNode) {
      throw new Error("max_burgers.identifierNode is undefined");
    }
    expect(max_burgers.identifierNode.type).toBe("identifier");
    expect(max_burgers.filepath).toBe(burgers);
  });

  test("resolves function signatures", () => {
    const function_names = exportedSymbols
      .filter((symbol) => symbol.type === "function_signature")
      .map((symbol) => symbol.name);
    expect(function_names).toHaveLength(4);
    expect(function_names).toContain("get_burger_by_id");
    expect(function_names).toContain("get_cheapest_burger");
    expect(function_names).toContain("create_burger");
    expect(function_names).toContain("destroy_burger");
    expect(function_names).not.toContain("MAX");
  });

  test("resolves macro functions", () => {
    const max_macro = exportedSymbols.find((symbol) => symbol.name === "MAX");
    expect(max_macro).toBeDefined();
    if (!max_macro) {
      throw new Error("max_macro is undefined");
    }
    expect(max_macro.type).toBe("macro_function");
    expect(max_macro.specifiers).toEqual([]);
    expect(max_macro.qualifiers).toEqual([]);
    expect(max_macro.node.type).toBe("preproc_function_def");
    if (!max_macro.identifierNode) {
      throw new Error("max_macro.identifierNode is undefined");
    }
    expect(max_macro.identifierNode.type).toBe("identifier");
    expect(max_macro.filepath).toBe(burgers);
  });

  test("resolves typedefs", () => {
    const fries = exportedSymbols.find((symbol) => symbol.name === "Fries");
    expect(fries).toBeDefined();
    if (!fries) {
      throw new Error("fries is undefined");
    }
    expect(fries.type).toBe("typedef");
    expect(fries.specifiers).toEqual([]);
    expect(fries.qualifiers).toEqual([]);
    expect(fries.node.type).toBe("type_definition");
    if (!fries.identifierNode) {
      throw new Error("fries.identifierNode is undefined");
    }
    expect(fries.identifierNode.type).toBe("type_identifier");
    expect(fries.filepath).toBe(burgers);

    const drink = exportedSymbols.find((symbol) => symbol.name === "Drink");
    expect(drink).toBeDefined();
    if (!drink) {
      throw new Error("drink is undefined");
    }
    expect(drink.type).toBe("typedef");
    expect(drink.specifiers).toEqual([]);
    expect(drink.qualifiers).toEqual([]);
    expect(drink.node.type).toBe("type_definition");
    if (!drink.identifierNode) {
      throw new Error("drink.identifierNode is undefined");
    }
    expect(drink.identifierNode.type).toBe("type_identifier");
    expect(drink.filepath).toBe(burgers);
  });

  test("Crash Cases", () => {
    const ccexportedSymbols = resolver.resolveSymbols(ccfile);
    expect(ccexportedSymbols).toBeDefined();

    const sprite = ccexportedSymbols.find((s) => s.name === "Sprite");
    expect(sprite).toBeDefined();
    if (!sprite) {
      throw new Error("sprite is undefined");
    }
    expect(sprite.type).toBe("struct");
    expect(sprite.specifiers).toEqual([]);
    expect(sprite.qualifiers).toEqual([]);
    expect(sprite.node.type).toBe("struct_specifier");
    if (!sprite.identifierNode) {
      throw new Error("sprite.identifierNode is undefined");
    }
    expect(sprite.identifierNode.type).toBe("type_identifier");
    expect(sprite.filepath).toBe(crashcases);

    const placeholderfunction = ccexportedSymbols.find(
      (s) => s.name === "PlaceholderFunction",
    );
    expect(placeholderfunction).toBeDefined();
    if (!placeholderfunction) {
      throw new Error("placeholderfunction is undefined");
    }
    expect(placeholderfunction.type).toBe("function_signature");
    expect(placeholderfunction.specifiers).toEqual([]);
    expect(placeholderfunction.qualifiers).toEqual([]);
    expect(placeholderfunction.node.type).toBe("declaration");
    if (!placeholderfunction.identifierNode) {
      throw new Error("placeholderfunction.identifierNode is undefined");
    }
    expect(placeholderfunction.identifierNode.type).toBe("identifier");
    expect(placeholderfunction.filepath).toBe(crashcases);

    const gmtfwa = ccexportedSymbols.find(
      (s) => s.name === "gMovementTypeFuncs_WanderAround",
    );
    expect(gmtfwa).toBeDefined();
    if (!gmtfwa) {
      throw new Error("gmtfwa is undefined");
    }
    expect(gmtfwa.type).toBe("variable");
    expect(gmtfwa.specifiers).toEqual([]);
    expect(gmtfwa.qualifiers).toEqual([]);
    expect(gmtfwa.node.type).toBe("declaration");
    if (!gmtfwa.identifierNode) {
      throw new Error("gmtfwa.identifierNode is undefined");
    }
    expect(gmtfwa.identifierNode.type).toBe("identifier");
    expect(gmtfwa.filepath).toBe(crashcases);
  });

  test("resolves unnamed types", () => {
    const exportedErrorSymbols = resolver.resolveSymbols(errorsfile);
    expect(exportedErrorSymbols).toBeDefined();
    const symbolNames = exportedErrorSymbols.map((symbol) => symbol.name);
    expect(symbolNames).toContain("#NAPI_UNNAMED_ENUM_0");
  });

  test("resolves typedefs with same name as associated struct", () => {
    const oldmanSymbols = resolver.resolveSymbols(
      cFilesMap.get(oldmanh)!,
    );
    expect(oldmanSymbols).toBeDefined();
    const oldmen = oldmanSymbols.filter((s) => s.name === "OldMan");
    expect(oldmen).toHaveLength(2);
    const oldman = oldmen.find((s) => s.type === "typedef");
    expect(oldman).toBeDefined();
    if (!oldman) {
      throw new Error("OldMan is undefined");
    }
    expect(oldman.type).toBe("typedef");
    expect(oldman.specifiers).toEqual([]);
    expect(oldman.qualifiers).toEqual([]);
    expect(oldman.node.type).toBe("type_definition");
    if (!oldman.identifierNode) {
      throw new Error("oldman.identifierNode is undefined");
    }
    expect(oldman.identifierNode.type).toBe("type_identifier");
    expect(oldman.filepath).toBe(oldmanh);
  });
});
