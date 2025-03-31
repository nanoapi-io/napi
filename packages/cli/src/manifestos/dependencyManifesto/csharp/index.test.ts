import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifesto } from ".";
import { getCSharpFilesMap } from "../../../languagePlugins/csharp/testFiles";

describe("generateCSharpDependencyManifesto", () => {
  const files = getCSharpFilesMap();
  const manifesto = generateCSharpDependencyManifesto(files);
  test("Correctly identifies files", () => {
    expect(Object.keys(manifesto).length).toBe(7);
  });
  test("Resolves exports", () => {
    expect(Object.keys(manifesto["2Namespaces1File.cs"].symbols).length).toBe(
      6,
    );
    expect(Object.keys(manifesto["Models.cs"].symbols).length).toBe(5);
    expect(Object.keys(manifesto["Namespaced.cs"].symbols).length).toBe(1);
    expect(Object.keys(manifesto["Nested.cs"].symbols).length).toBe(3);
    expect(Object.keys(manifesto["Program.cs"].symbols).length).toBe(1);
    expect(Object.keys(manifesto["SemiNamespaced.cs"].symbols).length).toBe(3);
    expect(Object.keys(manifesto["Usage.cs"].symbols).length).toBe(1);
  });
  test("Resolves dependencies", () => {
    expect(
      Object.keys(manifesto["2Namespaces1File.cs"].dependencies).length,
    ).toBe(1);
    expect(Object.keys(manifesto["Models.cs"].dependencies).length).toBe(1);
    expect(Object.keys(manifesto["Namespaced.cs"].dependencies).length).toBe(2);
    expect(Object.keys(manifesto["Nested.cs"].dependencies).length).toBe(2);
    expect(Object.keys(manifesto["Program.cs"].dependencies).length).toBe(16);
    expect(
      Object.keys(manifesto["SemiNamespaced.cs"].dependencies).length,
    ).toBe(3);
    expect(Object.keys(manifesto["Usage.cs"].dependencies).length).toBe(8);
  });
});
