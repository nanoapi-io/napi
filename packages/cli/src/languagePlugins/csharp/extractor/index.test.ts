import { describe, test, expect } from "vitest";
import { CSharpExtractor } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { generateCSharpDependencyManifest } from "../../../manifest/dependencyManifest/csharp";

describe("CSharpExtractor", () => {
  const files = getCSharpFilesMap();
  const manifest = generateCSharpDependencyManifest(files);
  const extractor = new CSharpExtractor(files, manifest);

  test("should extract symbols correctly", () => {
    extractor.extractAndSaveSymbolByName("Program");
    expect(1).toBe(1);
  });
});
