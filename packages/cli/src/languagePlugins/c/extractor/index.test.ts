import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  cFilesFolder,
  dummyLocalConfig,
  getCFilesContentMap,
} from "../testFiles/index.ts";
import { CExtractor } from "./index.ts";
import { join } from "@std/path";
import { generateCDependencyManifest } from "../../../manifest/dependencyManifest/c/index.ts";

describe("CExtractor", () => {
  const cContentMap = getCFilesContentMap();
  const manifest = generateCDependencyManifest(cContentMap, dummyLocalConfig);
  const extractor = new CExtractor(cContentMap, manifest, dummyLocalConfig);
  const burgers = join(cFilesFolder, "burgers.h");
  const burgersc = join(cFilesFolder, "burgers.c");
  const main = join(cFilesFolder, "main.c");
  const all = join(cFilesFolder, "all.h");
  const errorsh = join(cFilesFolder, "errors.h");
  test("extracts create_burger", () => {
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();
    symbolsToExtract.set(burgers, {
      filePath: burgers,
      symbols: new Set(["create_burger"]),
    });
    const extractedFiles = extractor.extractSymbols(symbolsToExtract);
    expect(extractedFiles.size).toBe(2);
    const newManifest = generateCDependencyManifest(
      extractedFiles,
      dummyLocalConfig,
    );
    expect(newManifest[burgers]).toBeDefined();
    expect(newManifest[burgersc]).toBeDefined();
    // Expected symbols to be kept
    expect(newManifest[burgers].symbols["create_burger"]).toBeDefined();
    expect(newManifest[burgersc].symbols["create_burger"]).toBeDefined();
    expect(newManifest[burgers].symbols["Condiment"]).toBeDefined();
    expect(newManifest[burgers].symbols["Burger"]).toBeDefined();
    expect(newManifest[burgers].symbols["Sauce"]).toBeDefined();
    expect(newManifest[burgers].symbols["burger_count"]).toBeDefined();
    expect(newManifest[burgers].symbols["BURGERS_H"]).toBeDefined();
    expect(newManifest[burgers].symbols["ClassicSauces"]).toBeDefined();
    // Expected symbols to be removed
    expect(newManifest[burgers].symbols["MAX_BURGERS"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["MAX"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["Fries"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["Drink_t"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["Drink"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["classicBurger"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["destroy_burger"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["get_burger_by_id"]).not.toBeDefined();
    expect(newManifest[burgers].symbols["get_cheapest_burger"]).not
      .toBeDefined();
  });

  test("extracts Drink_t", () => {
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();
    symbolsToExtract.set(burgers, {
      filePath: burgers,
      symbols: new Set(["Drink_t"]),
    });
    const extractedFiles = extractor.extractSymbols(symbolsToExtract);
    expect(extractedFiles.size).toBe(1);
    const newManifest = generateCDependencyManifest(
      extractedFiles,
      dummyLocalConfig,
    );
    expect(newManifest[burgers]).toBeDefined();
    // Expected symbols to be kept
    expect(newManifest[burgers].symbols["Drink_t"]).toBeDefined();
    expect(newManifest[burgers].symbols["Drink"]).toBeDefined();
    expect(newManifest[burgers].symbols["BURGERS_H"]).toBeDefined();
    // Expected symbols to be removed
    expect(Object.keys(newManifest[burgers].symbols).length).toBe(3);
  });

  test("keeps all.h", () => {
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();
    symbolsToExtract.set(main, {
      filePath: main,
      symbols: new Set(["main"]),
    });
    const extractedFiles = extractor.extractSymbols(symbolsToExtract);
    expect(extractedFiles.size).toBe(6);
    const newManifest = generateCDependencyManifest(
      extractedFiles,
      dummyLocalConfig,
    );
    expect(newManifest[all]).toBeDefined();
  });

  test("deletes impossible include", () => {
    const symbolsToExtract = new Map<
      string,
      { filePath: string; symbols: Set<string> }
    >();
    symbolsToExtract.set(errorsh, {
      filePath: errorsh,
      symbols: new Set(["typedef"]),
    });
    const extractedFiles = extractor.extractSymbols(symbolsToExtract);
    expect(extractedFiles.size).toBe(1);
    expect(extractedFiles.get(errorsh)).toBeDefined();
    expect(
      extractedFiles.get(errorsh)?.content.includes(
        `#include "thisfiledoesnotexist.h"`,
      ),
    ).toBe(false);
  });
});
