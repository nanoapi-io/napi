import { describe, test, expect } from "vitest";
import { CSharpExtractor } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { generateCSharpDependencyManifest } from "../../../manifest/dependencyManifest/csharp";

describe("CSharpExtractor", () => {
  const files = getCSharpFilesMap();
  const manifest = generateCSharpDependencyManifest(files);
  const extractor = new CSharpExtractor(files, manifest);

  test("should extract symbols correctly", () => {
    expect(extractor.extractSymbolByName("Program")?.length).toBe(8);
    expect(extractor.extractSymbolByName("ChickenBurger.Salad")?.length).toBe(
      1,
    );
    expect(
      extractor.extractSymbolByName("MyApp.BeefBurger.Steak")?.length,
    ).toBe(1);
    expect(extractor.extractSymbolByName("HeadCrab")?.length).toBe(2);
  });
});
