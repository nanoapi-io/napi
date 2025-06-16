import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getJavaFilesContentMap } from "../testFiles/index.ts";
import { generateJavaDependencyManifest } from "../../../manifest/dependencyManifest/java/index.ts";
import { JavaExtractor } from "./index.ts";
import { WORMKILLER } from "../testFiles/constants.ts";

describe("Java extractor", () => {
  const files = getJavaFilesContentMap();
  const manifest = generateJavaDependencyManifest(files);
  const extractor = new JavaExtractor(files, manifest);
  test("extracts wormkiller", () => {
    const symbolsMap: Map<string, { filePath: string; symbols: Set<string> }> =
      new Map();
    symbolsMap.set(WORMKILLER, {
      filePath: WORMKILLER,
      symbols: new Set("Wormkiller"),
    });
    const extracted = extractor.extractSymbols(symbolsMap);
    expect(extracted.size).toBe(4);
  });
});
