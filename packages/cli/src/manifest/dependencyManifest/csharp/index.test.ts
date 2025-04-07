import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifest } from ".";
import path from "path";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
} from "../../../languagePlugins/csharp/testFiles";

describe("generateCSharpDependencymanifest", () => {
  const files = getCSharpFilesMap();
  const manifest = generateCSharpDependencyManifest(files);
  test("Correctly identifies files", () => {
    expect(Object.keys(manifest).length).toBe(8);
  });
  test("Resolves exports", () => {
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "2Namespaces1File.cs")].symbols,
      ).length,
    ).toBe(6);
    expect(
      Object.keys(manifest[path.join(csharpFilesFolder, "Models.cs")].symbols)
        .length,
    ).toBe(5);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Namespaced.cs")].symbols,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(manifest[path.join(csharpFilesFolder, "Nested.cs")].symbols)
        .length,
    ).toBe(3);
    expect(
      Object.keys(manifest[path.join(csharpFilesFolder, "Program.cs")].symbols)
        .length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "SemiNamespaced.cs")].symbols,
      ).length,
    ).toBe(3);
    expect(
      Object.keys(manifest[path.join(csharpFilesFolder, "Usage.cs")].symbols)
        .length,
    ).toBe(1);
  });
  test("Resolves dependencies", () => {
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "2Namespaces1File.cs")]
          .dependencies,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Models.cs")].dependencies,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Namespaced.cs")].dependencies,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Nested.cs")].dependencies,
      ).length,
    ).toBe(1);
    console.log(
      manifest[path.join(csharpFilesFolder, "Program.cs")].dependencies,
    );
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Program.cs")].dependencies,
      ).length,
    ).toBe(9);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "SemiNamespaced.cs")]
          .dependencies,
      ).length,
    ).toBe(2);
    expect(
      Object.keys(
        manifest[path.join(csharpFilesFolder, "Usage.cs")].dependencies,
      ).length,
    ).toBe(6);
  });
});
