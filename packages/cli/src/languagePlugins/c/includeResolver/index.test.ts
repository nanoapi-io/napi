import { describe, test, expect } from "vitest";
import { getCFilesMap, cFilesFolder } from "../testFiles/index.js";
import { CSymbolRegistry } from "../symbolRegistry/index.js";
import { CIncludeResolver } from "./index.js";
import path from "path";

describe("CIncludeResolver", () => {
  const cFilesMap = getCFilesMap();
  const registry = new CSymbolRegistry(cFilesMap);
  const includeResolver = new CIncludeResolver(registry);
  const burgersh = path.join(cFilesFolder, "burgers.h");
  const burgersc = path.join(cFilesFolder, "burgers.c");
  const main = path.join(cFilesFolder, "main.c");
  const inclusions = includeResolver.getInclusions();

  test("resolves inclusions for burgers.h", () => {
    const bhinclusions = inclusions.get(burgersh);
    if (!bhinclusions) {
      throw new Error(`Inclusions not found for: ${burgersh}`);
    }
    expect(bhinclusions.filepath).toBe(burgersh);
    expect(bhinclusions.symbols.size).toBe(0);
    expect(bhinclusions.internal.length).toBe(0);
    expect(bhinclusions.standard.length).toBe(1);
    expect(bhinclusions.standard[0].text.trim()).toBe("#include <stdbool.h>");
  });

  test("resolves inclusions for burgers.c", () => {
    const bcinclusions = inclusions.get(burgersc);
    if (!bcinclusions) {
      throw new Error(`Inclusions not found for: ${burgersc}`);
    }
    expect(bcinclusions.filepath).toBe(burgersc);
    expect(bcinclusions.symbols.size).toBe(15);
    expect(bcinclusions.internal.length).toBe(1);
    expect(bcinclusions.internal[0]).toBe("burgers.h");
    expect(bcinclusions.standard.length).toBe(3);
    const stdincludes = bcinclusions.standard.map((node) => node.text.trim());
    expect(stdincludes).toContain("#include <stdio.h>");
    expect(stdincludes).toContain("#include <stdlib.h>");
    expect(stdincludes).toContain("#include <string.h>");
  });

  test("resolves inclusions for main.c", () => {
    const maininclusions = inclusions.get(main);
    if (!maininclusions) {
      throw new Error(`Inclusions not found for: ${main}`);
    }
    expect(maininclusions.filepath).toBe(main);
    expect(maininclusions.symbols.size).toBe(15);
    expect(maininclusions.internal.length).toBe(1);
    expect(maininclusions.internal[0]).toBe("burgers.h");
    expect(maininclusions.standard.length).toBe(1);
    const stdincludes = maininclusions.standard.map((node) => node.text.trim());
    expect(stdincludes).toContain("#include <stdio.h>");
  });
});
