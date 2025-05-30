import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CSymbolRegistry } from "../symbolRegistry/index.ts";
import { CIncludeResolver } from "../includeResolver/index.ts";
import { CInvocationResolver } from "./index.ts";
import type { Symbol } from "../symbolRegistry/types.ts";
import { join } from "@std/path";

describe("CInvocationResolver", () => {
  const cFilesMap = getCFilesMap();
  const symbolRegistry = new CSymbolRegistry(cFilesMap);
  const includeResolver = new CIncludeResolver(symbolRegistry);
  const invocationResolver = new CInvocationResolver(includeResolver);
  const burgersh = join(cFilesFolder, "burgers.h");
  const burgersc = join(cFilesFolder, "burgers.c");
  const personnelc = join(cFilesFolder, "personnel.c");
  const crashcasesh = join(cFilesFolder, "crashcases.h");
  const errorsh = join(cFilesFolder, "errors.h");
  const main = join(cFilesFolder, "main.c");
  const registry = symbolRegistry.getRegistry();

  test("resolves invocations for burgers.h", () => {
    const symbols = registry.get(burgersh)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${burgersh}`);
    }
    const sauce = symbols.get("Sauce") as Symbol;
    const sauceinvocations = invocationResolver.getInvocationsForSymbol(sauce);
    expect(sauceinvocations.resolved.size).toBe(1);
    expect(sauceinvocations.resolved.get("ClassicSauces")).toBeDefined();

    const fries = symbols.get("Fries") as Symbol;
    const friesinvocations = invocationResolver.getInvocationsForSymbol(fries);
    expect(friesinvocations.resolved.size).toBe(1);
    expect(friesinvocations.resolved.get("Sauce")).toBeDefined();

    const burger = symbols.get("Burger") as Symbol;
    const burgerinvocations = invocationResolver.getInvocationsForSymbol(
      burger,
    );
    expect(burgerinvocations.resolved.size).toBe(2);
    expect(burgerinvocations.resolved.get("Condiment")).toBeDefined();
    expect(burgerinvocations.resolved.get("Sauce")).toBeDefined();
  });

  test("resolves invocations for burgers.c", () => {
    const symbols = registry.get(burgersc)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${burgersc}`);
    }
    const create_burger = symbols.get("create_burger") as Symbol;
    const create_burger_invocations = invocationResolver
      .getInvocationsForSymbol(create_burger);
    const create_resolved = Array.from(
      create_burger_invocations.resolved.keys(),
    );
    expect(create_resolved.length).toBe(5);
    expect(create_resolved).toContain("create_burger");
    expect(create_resolved).toContain("Burger");
    expect(create_resolved).toContain("Condiment");
    expect(create_resolved).toContain("Sauce");
    expect(create_resolved).toContain("burger_count");

    const destroy_burger = symbols.get("destroy_burger") as Symbol;
    const destroy_burger_invocations = invocationResolver
      .getInvocationsForSymbol(destroy_burger);
    const destroy_resolved = Array.from(
      destroy_burger_invocations.resolved.keys(),
    );
    expect(destroy_resolved.length).toBe(2);
    expect(destroy_resolved).toContain("destroy_burger");
    expect(destroy_resolved).toContain("Burger");

    const symbolsc = registry.get(burgersc)?.symbols;
    if (!symbolsc) {
      throw new Error(`Symbol not found for: ${burgersc}`);
    }

    const burgers = symbolsc.get("burgers") as Symbol;
    const burgers_invocations = invocationResolver.getInvocationsForSymbol(
      burgers,
    );
    const burgers_resolved = Array.from(burgers_invocations.resolved.keys());
    expect(burgers_resolved.length).toBe(2);
    expect(burgers_resolved).toContain("Burger");
    expect(burgers_resolved).toContain("MAX_BURGERS");
  });

  test("resolves invocations for personnel.c", () => {
    const symbols = registry.get(personnelc)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${personnelc}`);
    }
    const create_employee = symbols.get("create_employee") as Symbol;
    const create_employee_invocations = invocationResolver
      .getInvocationsForSymbol(create_employee);
    const create_resolved = Array.from(
      create_employee_invocations.resolved.keys(),
    );
    expect(create_resolved.length).toBe(6);
    expect(create_resolved).toContain("create_employee");
    expect(create_resolved).toContain("Employee");
    expect(create_resolved).toContain("Department");
    expect(create_resolved).toContain("MAX_EMPLOYEES");
    expect(create_resolved).toContain("employee_count");
    expect(create_resolved).toContain("employees");
  });

  test("resolves invocations for main.c", () => {
    const symbols = registry.get(main)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${main}`);
    }
    const main_func = symbols.get("main") as Symbol;
    const main_invocations = invocationResolver.getInvocationsForSymbol(
      main_func,
    );
    const main_resolved = Array.from(main_invocations.resolved.keys());
    expect(main_resolved.length).toBe(9);
    expect(main_resolved).toContain("create_burger");
    expect(main_resolved).toContain("Burger");
    expect(main_resolved).toContain("create_employee");
    expect(main_resolved).toContain("Employee");
    expect(main_resolved).toContain("Condiment");
    expect(main_resolved).toContain("Sauce");
  });

  test("Crash Cases", () => {
    const symbols = registry.get(crashcasesh)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${crashcasesh}`);
    }
    const crash = symbols.get("CpuFastFill") as Symbol;
    const crash_invocations = invocationResolver.getInvocationsForSymbol(crash);
    const crash_resolved = Array.from(crash_invocations.resolved.keys());
    expect(crash_resolved.length).toBe(2);
    expect(crash_resolved).toContain("CpuFastSet");
    expect(crash_resolved).toContain("CPU_FAST_SET_SRC_FIXED");
  });

  test("Errors", () => {
    const symbols = registry.get(errorsh)?.symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${errorsh}`);
    }
    const xbox = symbols.get("xbox") as Symbol;
    const xbox_invocations = invocationResolver.getInvocationsForSymbol(xbox);
    const xbox_resolved = Array.from(xbox_invocations.resolved.keys());
    expect(xbox_resolved.length).toBe(1);
    expect(xbox_resolved).toContain("#NAPI_UNNAMED_ENUM_0");
  });
});
