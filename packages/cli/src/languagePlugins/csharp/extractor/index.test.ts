import { describe, test, expect } from "vitest";
import { CSharpExtractor } from "./index.js";
import { getCSharpFilesMap, getCsprojFilesMap } from "../testFiles/index.js";
import { generateCSharpDependencyManifest } from "../../../manifest/dependencyManifest/csharp/index.js";

describe("CSharpExtractor", () => {
  const parsedfiles = getCSharpFilesMap();
  const csprojFiles = getCsprojFilesMap();
  const files = new Map<string, { path: string; content: string }>();
  for (const [filePath, { path, rootNode }] of parsedfiles) {
    files.set(filePath, { path, content: rootNode.text });
  }
  for (const [filePath, { path, content }] of csprojFiles) {
    files.set(filePath, { path, content });
  }
  const manifest = generateCSharpDependencyManifest(files);
  const extractor = new CSharpExtractor(files, manifest);

  test("should extract symbols correctly", () => {
    expect(extractor.extractSymbolByName("Program")?.length).toBe(9);
    expect(extractor.extractSymbolByName("ChickenBurger.Salad")?.length).toBe(
      1,
    );
    expect(
      extractor.extractSymbolByName("MyApp.BeefBurger.Steak")?.length,
    ).toBe(1);
    expect(extractor.extractSymbolByName("HeadCrab")?.length).toBe(2);
  });
});
