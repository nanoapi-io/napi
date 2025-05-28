import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CSymbolRegistry } from "../symbolRegistry/index.ts";
import { CIncludeResolver } from "./index.ts";
import { join } from "@std/path";
import type { FunctionSignature } from "../symbolRegistry/types.ts";

describe("CIncludeResolver", () => {
  const cFilesMap = getCFilesMap();
  const registry = new CSymbolRegistry(cFilesMap);
  const includeResolver = new CIncludeResolver(registry);
  const burgersh = join(cFilesFolder, "burgers.h");
  const burgersc = join(cFilesFolder, "burgers.c");
  const allh = join(cFilesFolder, "all.h");
  const main = join(cFilesFolder, "main.c");
  const errorsh = join(cFilesFolder, "errors.h");
  const inclusions = includeResolver.getInclusions();

  test("resolves inclusions for burgers.h", () => {
    const bhinclusions = inclusions.get(burgersh);
    if (!bhinclusions) {
      throw new Error(`Inclusions not found for: ${burgersh}`);
    }
    expect(bhinclusions.filepath).toBe(burgersh);
    expect(bhinclusions.symbols.size).toBe(0);
    expect(bhinclusions.internal.children.size).toBe(0);
    expect(bhinclusions.standard.size).toBe(1);
    expect(Array.from(bhinclusions.standard.keys())[0]).toBe("<stdbool.h>");
  });

  test("resolves inclusions for burgers.c", () => {
    const bcinclusions = inclusions.get(burgersc);
    if (!bcinclusions) {
      throw new Error(`Inclusions not found for: ${burgersc}`);
    }
    expect(bcinclusions.filepath).toBe(burgersc);
    expect(bcinclusions.symbols.size).toBe(32);
    expect(bcinclusions.internal.children.size).toBe(1);
    expect(bcinclusions.internal.children.get("burgers.h")).toBeDefined();
    expect(bcinclusions.standard.size).toBe(4);
    const stdincludes = Array.from(bcinclusions.standard.keys());
    expect(stdincludes).toContain("<stdio.h>");
    expect(stdincludes).toContain("<stdlib.h>");
    expect(stdincludes).toContain("<string.h>");
  });

  test("resolves inclusions for main.c", () => {
    const maininclusions = inclusions.get(main);
    if (!maininclusions) {
      throw new Error(`Inclusions not found for: ${main}`);
    }
    expect(maininclusions.filepath).toBe(main);
    expect(maininclusions.symbols.size).toBe(32 + 17);
    expect(maininclusions.symbols.get("create_burger")?.includefile.file.path)
      .toBe(allh);
    expect(maininclusions.internal.children.size).toBe(1);
    expect(maininclusions.internal.children.get("burgers.h")).not.toBeDefined();
    expect(maininclusions.internal.children.get("personnel.h")).not
      .toBeDefined();
    expect(maininclusions.internal.children.get("all.h")).toBeDefined();
    const allinclusions = maininclusions.internal.children.get("all.h")!;
    expect(allinclusions.children.get("burgers.h")).toBeDefined();
    expect(allinclusions.children.get("personnel.h")).toBeDefined();
    expect(maininclusions.standard.size).toBe(2);
    const stdincludes = Array.from(maininclusions.standard.keys());
    expect(stdincludes).toContain("<stdio.h>");
  });

  test("finds signatures for functions", () => {
    const burgers = registry.getRegistry().get(burgersh)?.symbols;
    if (!burgers) {
      throw new Error(`File not found: ${burgersh}`);
    }
    const create_burger = burgers.get("create_burger") as FunctionSignature;
    const destroy = burgers.get("destroy_burger") as FunctionSignature;
    const get = burgers.get("get_burger_by_id") as FunctionSignature;
    const cheapest = burgers.get("get_cheapest_burger") as FunctionSignature;
    expect(create_burger.definition).toBeDefined();
    expect(destroy.definition).toBeDefined();
    expect(get.definition).toBeDefined();
    expect(cheapest.definition).toBeDefined();
  });

  test("correctly registers inexistant files", () => {
    const unresolvedIncludes = includeResolver.unresolvedDirectives.get(
      errorsh,
    );
    expect(unresolvedIncludes).toBeDefined();
    expect(unresolvedIncludes).toContainEqual("thisfiledoesnotexist.h");
  });
});
