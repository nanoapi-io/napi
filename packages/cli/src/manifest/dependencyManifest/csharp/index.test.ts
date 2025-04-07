import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifest } from ".";
import { getCSharpFilesMap } from "../../../languagePlugins/csharp/testFiles";

describe("generateCSharpDependencymanifest", () => {
  const files = getCSharpFilesMap();
  const manifest = generateCSharpDependencyManifest(files);
  test("Correctly identifies files", () => {
    expect(Object.keys(manifest).length).toBe(8);
  });
  test("Resolves exports", () => {
    expect(Object.keys(manifest["2Namespaces1File.cs"].symbols).length).toBe(6);
    expect(Object.keys(manifest["Models.cs"].symbols).length).toBe(5);
    expect(Object.keys(manifest["Namespaced.cs"].symbols).length).toBe(1);
    expect(Object.keys(manifest["Nested.cs"].symbols).length).toBe(3);
    expect(Object.keys(manifest["Program.cs"].symbols).length).toBe(1);
    expect(Object.keys(manifest["SemiNamespaced.cs"].symbols).length).toBe(3);
    expect(Object.keys(manifest["Usage.cs"].symbols).length).toBe(1);
  });
  test("Resolves dependencies", () => {
    expect(
      Object.keys(manifest["2Namespaces1File.cs"].dependencies).length,
    ).toBe(1);
    expect(Object.keys(manifest["Models.cs"].dependencies).length).toBe(1);
    expect(Object.keys(manifest["Namespaced.cs"].dependencies).length).toBe(1);
    expect(Object.keys(manifest["Nested.cs"].dependencies).length).toBe(1);
    console.log(manifest["Program.cs"].dependencies);
    expect(Object.keys(manifest["Program.cs"].dependencies).length).toBe(9);
    expect(Object.keys(manifest["SemiNamespaced.cs"].dependencies).length).toBe(
      2,
    );
    expect(Object.keys(manifest["Usage.cs"].dependencies).length).toBe(6);
  });
});
