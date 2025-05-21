import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CSymbolRegistry } from "./index.ts";
import {
  DataType,
  FunctionDefinition,
  FunctionSignature,
  Typedef,
  Variable,
} from "./types.ts";
import path from "node:path";

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
    expect(hsymbols.symbols.size).toBe(32);
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

  test("registers enum members for burgers.h", () => {
    expect(hsymbols.symbols.get("NONE")).toBeDefined();
    expect(hsymbols.symbols.get("SALAD")).toBeDefined();
    expect(hsymbols.symbols.get("TOMATO")).toBeDefined();
    expect(hsymbols.symbols.get("ONION")).toBeDefined();
    expect(hsymbols.symbols.get("CHEESE")).toBeDefined();
    expect(hsymbols.symbols.get("PICKLE")).toBeDefined();
    expect(hsymbols.symbols.get("KETCHUP")).toBeDefined();
    expect(hsymbols.symbols.get("MUSTARD")).toBeDefined();
    expect(hsymbols.symbols.get("BBQ")).toBeDefined();
    expect(hsymbols.symbols.get("MAYO")).toBeDefined();
    expect(hsymbols.symbols.get("SPICY")).toBeDefined();
    expect(hsymbols.symbols.get("COKE")).toBeDefined();
    expect(hsymbols.symbols.get("ICED_TEA")).toBeDefined();
    expect(hsymbols.symbols.get("LEMONADE")).toBeDefined();
    expect(hsymbols.symbols.get("WATER")).toBeDefined();
    expect(hsymbols.symbols.get("COFFEE")).toBeDefined();
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
    expect((drink as Typedef).datatype?.name).toBe("Drink_t");
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
    expect(max).toBeInstanceOf(FunctionDefinition);
    expect(create).toBeInstanceOf(FunctionSignature);
    expect(destroy).toBeInstanceOf(FunctionSignature);
    expect(get).toBeInstanceOf(FunctionSignature);
    expect(cheapest).toBeInstanceOf(FunctionSignature);
    expect((max as FunctionDefinition).isMacro).toBe(true);
    expect((create as FunctionSignature).isMacro).toBe(false);
    expect((destroy as FunctionSignature).isMacro).toBe(false);
    expect((get as FunctionSignature).isMacro).toBe(false);
    expect((cheapest as FunctionSignature).isMacro).toBe(false);
    expect((max as FunctionDefinition).declaration.node.type).toBe(
      "preproc_function_def",
    );
    expect((create as FunctionSignature).definition?.declaration.node.type)
      .toBe(
        "function_definition",
      );
    expect(
      (destroy as FunctionSignature).definition?.declaration.node.type,
    ).toBe("function_definition");
    expect((get as FunctionSignature).definition?.declaration.node.type).toBe(
      "function_definition",
    );
    expect(
      (cheapest as FunctionSignature).definition?.declaration.node.type,
    ).toBe("function_definition");
    expect((max as FunctionDefinition).declaration.filepath).toBe(burgersh);
    expect((create as FunctionSignature).definition?.declaration.filepath).toBe(
      burgersc,
    );
    expect((destroy as FunctionSignature).definition?.declaration.filepath)
      .toBe(
        burgersc,
      );
    expect((get as FunctionSignature).definition?.declaration.filepath).toBe(
      burgersc,
    );
    expect(
      (cheapest as FunctionSignature).definition?.declaration.filepath,
    ).toBe(burgersc);
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
    expect(csymbols.symbols.size).toBe(5);
  });

  test("registers variables for burgers.c", () => {
    const burgers = csymbols.symbols.get("burgers");
    expect(burgers).toBeDefined();
    expect(burgers).toBeInstanceOf(Variable);
    expect((burgers as Variable).isMacro).toBe(false);
  });

  test("registers main", () => {
    const main = path.join(cFilesFolder, "main.c");
    const mainsymbols = registry.get(main);
    if (!mainsymbols) {
      throw new Error(`File not found: ${main}`);
    }
    expect(mainsymbols.type).toBe(".c");
    expect(mainsymbols.symbols.size).toBe(1);
    const mainfunc = mainsymbols.symbols.get("main");
    expect(mainfunc).toBeDefined();
    expect(mainfunc).toBeInstanceOf(FunctionDefinition);
    expect((mainfunc as FunctionDefinition).isMacro).toBe(false);
    expect((mainfunc as FunctionDefinition).declaration.node.type).toBe(
      "function_definition",
    );
    expect((mainfunc as FunctionDefinition).declaration.filepath).toBe(main);
    expect((mainfunc as FunctionDefinition).declaration.node.type).toBe(
      "function_definition",
    );
  });
});
