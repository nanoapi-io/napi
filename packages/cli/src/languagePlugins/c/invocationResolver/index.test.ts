import { describe, test, expect } from "vitest";
import { getCFilesMap, cFilesFolder } from "../testFiles/index.js";
import { CSymbolRegistry } from "../symbolRegistry/index.js";
import { CIncludeResolver } from "../includeResolver/index.js";
import { CInvocationResolver } from "./index.js";
import path from "path";

describe("CInvocationResolver", () => {
  const cFilesMap = getCFilesMap();
  const symbolRegistry = new CSymbolRegistry(cFilesMap);
  const includeResolver = new CIncludeResolver(symbolRegistry);
  const invocationResolver = new CInvocationResolver(includeResolver);
  const burgersh = path.join(cFilesFolder, "burgers.h");
  const burgersc = path.join(cFilesFolder, "burgers.c");
  const personnelh = path.join(cFilesFolder, "personnel.h");
  const crashcasesh = path.join(cFilesFolder, "crashcases.h");
  const main = path.join(cFilesFolder, "main.c");
  const registry = symbolRegistry.getRegistry();

  test("resolves invocations for burgers.h", () => {
    const symbols = registry.get(burgersh).symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${burgersh}`);
    }
    const sauce = symbols.get("Sauce");
    const sauceinvocations = invocationResolver.getInvocationsForSymbol(sauce);
    expect(sauceinvocations.resolved.size).toBe(1);
    expect(sauceinvocations.resolved.get("ClassicSauces")).toBeDefined();

    const fries = symbols.get("Fries");
    const friesinvocations = invocationResolver.getInvocationsForSymbol(fries);
    expect(friesinvocations.resolved.size).toBe(1);
    expect(friesinvocations.resolved.get("Sauce")).toBeDefined();

    const burger = symbols.get("Burger");
    const burgerinvocations =
      invocationResolver.getInvocationsForSymbol(burger);
    expect(burgerinvocations.resolved.size).toBe(2);
    expect(burgerinvocations.resolved.get("Condiment")).toBeDefined();
    expect(burgerinvocations.resolved.get("Sauce")).toBeDefined();
  });

  test("resolves invocations for burgers.c", () => {
    const symbols = registry.get(burgersh).symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${burgersc}`);
    }
    const create_burger = symbols.get("create_burger");
    const create_burger_invocations =
      invocationResolver.getInvocationsForSymbol(create_burger);
    const create_resolved = Array.from(
      create_burger_invocations.resolved.keys(),
    );
    expect(create_resolved.length).toBe(4);
    expect(create_resolved).toContain("Burger");
    expect(create_resolved).toContain("Condiment");
    expect(create_resolved).toContain("Sauce");
    expect(create_resolved).toContain("burger_count");

    const destroy_burger = symbols.get("destroy_burger");
    const destroy_burger_invocations =
      invocationResolver.getInvocationsForSymbol(destroy_burger);
    const destroy_resolved = Array.from(
      destroy_burger_invocations.resolved.keys(),
    );
    expect(destroy_resolved.length).toBe(1);
    expect(destroy_resolved).toContain("Burger");

    const symbolsc = registry.get(burgersc).symbols;

    const burgers = symbolsc.get("burgers");
    const burgers_invocations =
      invocationResolver.getInvocationsForSymbol(burgers);
    const burgers_resolved = Array.from(burgers_invocations.resolved.keys());
    expect(burgers_resolved.length).toBe(2);
    expect(burgers_resolved).toContain("Burger");
    expect(burgers_resolved).toContain("MAX_BURGERS");
  });

  test("resolves invocations for personnel.c", () => {
    const symbols = registry.get(personnelh).symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${personnelh}`);
    }
    const create_employee = symbols.get("create_employee");
    const create_employee_invocations =
      invocationResolver.getInvocationsForSymbol(create_employee);
    const create_resolved = Array.from(
      create_employee_invocations.resolved.keys(),
    );
    expect(create_resolved.length).toBe(5);
    expect(create_resolved).toContain("Employee");
    expect(create_resolved).toContain("Department");
    expect(create_resolved).toContain("MAX_EMPLOYEES");
    expect(create_resolved).toContain("employee_count");
    expect(create_resolved).toContain("employees");
  });

  test("resolves invocations for main.c", () => {
    const symbols = registry.get(main).symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${main}`);
    }
    const main_func = symbols.get("main");
    const main_invocations =
      invocationResolver.getInvocationsForSymbol(main_func);
    const main_resolved = Array.from(main_invocations.resolved.keys());
    expect(main_resolved.length).toBe(7);
    expect(main_resolved).toContain("create_burger");
    expect(main_resolved).toContain("Burger");
    expect(main_resolved).toContain("create_employee");
    expect(main_resolved).toContain("Employee");
    expect(main_resolved).toContain("Condiment");
    expect(main_resolved).toContain("Sauce");
  });

  test("Crash Cases", () => {
    const symbols = registry.get(crashcasesh).symbols;
    if (!symbols) {
      throw new Error(`Symbol not found for: ${crashcasesh}`);
    }
    const crash = symbols.get("CpuFastFill");
    const crash_invocations = invocationResolver.getInvocationsForSymbol(crash);
    const crash_resolved = Array.from(crash_invocations.resolved.keys());
    expect(crash_resolved.length).toBe(2);
    expect(crash_resolved).toContain("CpuFastSet");
    expect(crash_resolved).toContain("CPU_FAST_SET_SRC_FIXED");
  });
});
