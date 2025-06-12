import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getJavaFilesContentMap } from "../testFiles/index.ts";
import { JavaDependencyFormatter } from "./index.ts";
import { PEBBLE, STEAK, WORMKILLER } from "../testFiles/constants.ts";

describe("Java dependency formatter", () => {
  const files = getJavaFilesContentMap();
  const formatter = new JavaDependencyFormatter(files);

  test("formats Wormkiller.java", () => {
    const killer = formatter.formatFile(WORMKILLER);
    expect(killer).toBeDefined();
    expect(killer.lineCount >= 11).toBe(true);
    expect(killer.characterCount > 250).toBe(true);
    expect(killer.dependencies[STEAK]).toBeDefined();
    expect(killer.dependencies[PEBBLE]).toBeDefined();
    expect(killer.dependencies[STEAK].symbols["Steak"]).toBeDefined();
    expect(killer.dependencies[PEBBLE].symbols["Pebble"]).toBeDefined();
    expect(killer.filePath).toBe(WORMKILLER);
    expect(killer.id).toBe(WORMKILLER);
    expect(killer.symbols["Wormkiller"]).toBeDefined();
    expect(killer.symbols["Wormkiller"].dependencies[STEAK]).toBeDefined();
    expect(killer.symbols["Wormkiller"].dependencies[PEBBLE]).toBeDefined();
    expect(killer.symbols["Wormkiller"].type).toBe("class");
  });
});
