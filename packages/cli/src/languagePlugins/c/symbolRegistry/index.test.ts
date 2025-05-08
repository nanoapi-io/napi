import { describe, test, expect } from "vitest";
import { getCFilesMap, cFilesFolder } from "../testFiles/index.js";
import { CSymbolRegistry } from "./index.js";
import { DataType, Function, Variable, Typedef } from "./types.js";
import path from "path";

describe("CSymbolRegistry", () => {
  const cFilesMap = getCFilesMap();
  const registry = new CSymbolRegistry(cFilesMap).getRegistry();
  const burgersh = path.join(cFilesFolder, "burgers.h");
  const burgersc = path.join(cFilesFolder, "burgers.c");
  const hsymbols = registry.get(burgersh);
  if (!hsymbols) {
    throw new Error(`File not found: ${burgersh}`);
  }
  const csymbols = registry.get(burgersc);
  if (!csymbols) {
    throw new Error(`File not found: ${burgersc}`);
  }

  test("registers symbols for burgers.h", () => {
    expect(hsymbols.type).toBe(".h");
    expect(hsymbols.symbols.size).toBe(16);
  });

  test("registers datatypes for burgers.h", () => {
    expect(hsymbols.symbols.get("Burger")).toBeDefined();
    expect(hsymbols.symbols.get("Sauce")).toBeDefined();
    expect(hsymbols.symbols.get("Condiment")).toBeDefined();
    expect(hsymbols.symbols.get("ClassicSauces")).toBeDefined();
    expect(hsymbols.symbols.get("Drink_t")).toBeDefined();
    expect(hsymbols.symbols.get("Burger")).toBeInstanceOf(DataType);
    expect(hsymbols.symbols.get("Sauce")).toBeInstanceOf(DataType);
    expect(hsymbols.symbols.get("Condiment")).toBeInstanceOf(DataType);
    expect(hsymbols.symbols.get("ClassicSauces")).toBeInstanceOf(DataType);
    expect(hsymbols.symbols.get("Drink_t")).toBeInstanceOf(DataType);
  });

  test("registers typedefs for burgers.h", () => {
    const drink = hsymbols.symbols.get("Drink");
    const fries = hsymbols.symbols.get("Fries");
    expect(drink).toBeDefined();
    expect(fries).toBeDefined();
    expect(drink).toBeInstanceOf(Typedef);
    expect(fries).toBeInstanceOf(Typedef);
    expect((drink as Typedef).datatype).toBeDefined();
    expect((fries as Typedef).datatype).not.toBeDefined();
    expect((drink as Typedef).datatype).toBeInstanceOf(DataType);
    expect((drink as Typedef).datatype.name).toBe("Drink_t");
  });

  test("registers functions for burgers.h", () => {
    const max = hsymbols.symbols.get("MAX");
    const create = hsymbols.symbols.get("create_burger");
    const destroy = hsymbols.symbols.get("destroy_burger");
    const get = hsymbols.symbols.get("get_burger_by_id");
    const cheapest = hsymbols.symbols.get("get_cheapest_burger");
    expect(max).toBeDefined();
    expect(create).toBeDefined();
    expect(destroy).toBeDefined();
    expect(get).toBeDefined();
    expect(cheapest).toBeDefined();
    expect(max).toBeInstanceOf(Function);
    expect(create).toBeInstanceOf(Function);
    expect(destroy).toBeInstanceOf(Function);
    expect(get).toBeInstanceOf(Function);
    expect(cheapest).toBeInstanceOf(Function);
    expect((max as Function).isMacro).toBe(true);
    expect((create as Function).isMacro).toBe(false);
    expect((destroy as Function).isMacro).toBe(false);
    expect((get as Function).isMacro).toBe(false);
    expect((cheapest as Function).isMacro).toBe(false);
    expect((max as Function).definition.type).toBe("preproc_function_def");
    expect((create as Function).definition.type).toBe("function_definition");
    expect((destroy as Function).definition.type).toBe("function_definition");
    expect((get as Function).definition.type).toBe("function_definition");
    expect((cheapest as Function).definition.type).toBe("function_definition");
    expect((max as Function).definitionPath).toBe(burgersh);
    expect((create as Function).definitionPath).toBe(burgersc);
    expect((destroy as Function).definitionPath).toBe(burgersc);
    expect((get as Function).definitionPath).toBe(burgersc);
    expect((cheapest as Function).definitionPath).toBe(burgersc);
  });

  test("registers variables for burgers.h", () => {
    const burgers_count = hsymbols.symbols.get("burger_count");
    const max_burgers = hsymbols.symbols.get("MAX_BURGERS");
    const burgers_h = hsymbols.symbols.get("BURGERS_H");
    expect(burgers_h).toBeDefined();
    expect(max_burgers).toBeDefined();
    expect(burgers_count).toBeDefined();
    expect(burgers_h).toBeInstanceOf(Variable);
    expect(max_burgers).toBeInstanceOf(Variable);
    expect(burgers_count).toBeInstanceOf(Variable);
    expect((burgers_h as Variable).isMacro).toBe(true);
    expect((max_burgers as Variable).isMacro).toBe(true);
    expect((burgers_count as Variable).isMacro).toBe(false);
  });

  test("registers symbols for burgers.c", () => {
    expect(csymbols.type).toBe(".c");
    expect(csymbols.symbols.size).toBe(1);
  });

  test("registers variables for burgers.c", () => {
    const burgers = csymbols.symbols.get("burgers");
    expect(burgers).toBeDefined();
    expect(burgers).toBeInstanceOf(Variable);
    expect((burgers as Variable).isMacro).toBe(false);
  });
});
