import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import { CSymbolRegistry } from "../symbolRegistry/index.ts";
import { CIncludeResolver } from "./index.ts";
import { join } from "@std/path";

describe("CIncludeResolver", () => {
  const cFilesMap = getCFilesMap();
  const registry = new CSymbolRegistry(cFilesMap);
  const includeResolver = new CIncludeResolver(registry);
  const burgersh = join(cFilesFolder, "burgers.h");
  const burgersc = join(cFilesFolder, "burgers.c");
  const main = join(cFilesFolder, "main.c");
  const inclusions = includeResolver.getInclusions();

  test("resolves inclusions for burgers.h", () => {
    const bhinclusions = inclusions.get(burgersh);
    if (!bhinclusions) {
      throw new Error(`Inclusions not found for: ${burgersh}`);
    }
    expect(bhinclusions.filepath).toBe(burgersh);
    expect(bhinclusions.symbols.size).toBe(0);
    expect(bhinclusions.internal.length).toBe(0);
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
    expect(bcinclusions.internal.length).toBe(1);
    expect(bcinclusions.internal[0]).toBe("burgers.h");
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
    expect(maininclusions.internal.length).toBe(2);
    expect(maininclusions.internal).toContain("burgers.h");
    expect(maininclusions.internal).toContain("personnel.h");
    expect(maininclusions.standard.size).toBe(2);
    const stdincludes = Array.from(maininclusions.standard.keys());
    expect(stdincludes).toContain("<stdio.h>");
  });
});
