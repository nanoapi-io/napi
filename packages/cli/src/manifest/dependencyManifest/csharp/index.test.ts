import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifest } from "./index.js";
import path from "path";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../../../languagePlugins/csharp/testFiles/index.js";

describe("generateCSharpDependencymanifest", () => {
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
  const burgers = path.join(csharpFilesFolder, "2Namespaces1File.cs");
  const models = path.join(csharpFilesFolder, "Models.cs");
  const namespaced = path.join(csharpFilesFolder, "Namespaced.cs");
  const nested = path.join(csharpFilesFolder, "Nested.cs");
  const program = path.join(csharpFilesFolder, "Program.cs");
  const semiNamespaced = path.join(csharpFilesFolder, "SemiNamespaced.cs");
  const usage = path.join(csharpFilesFolder, "Usage.cs");

  test("Correctly identifies files", () => {
    expect(Object.keys(manifest).length).toBe(9);
  });

  test("Resolves exports", () => {
    expect(Object.keys(manifest[burgers].symbols).length).toBe(6);
    expect(Object.keys(manifest[models].symbols).length).toBe(5);
    expect(Object.keys(manifest[namespaced].symbols).length).toBe(1);
    expect(Object.keys(manifest[nested].symbols).length).toBe(3);
    expect(Object.keys(manifest[program].symbols).length).toBe(1);
    expect(Object.keys(manifest[semiNamespaced].symbols).length).toBe(3);
    expect(Object.keys(manifest[usage].symbols).length).toBe(1);
  });

  test("Resolves dependencies", () => {
    expect(Object.keys(manifest[burgers].dependencies).length).toBe(2);
    expect(Object.keys(manifest[models].dependencies).length).toBe(1);
    expect(Object.keys(manifest[namespaced].dependencies).length).toBe(1);
    expect(Object.keys(manifest[nested].dependencies).length).toBe(1);
    expect(Object.keys(manifest[program].dependencies).length).toBe(6);
    expect(Object.keys(manifest[semiNamespaced].dependencies).length).toBe(2);
    expect(Object.keys(manifest[usage].dependencies).length).toBe(4);
  });

  test("Resolves dependents", () => {
    expect(
      Object.keys(manifest[burgers].symbols["MyApp.BeefBurger.Bun"].dependents)
        .length,
    ).toBe(1);
    expect(
      Object.keys(manifest[burgers].symbols["ChickenBurger.Bun"].dependents)
        .length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[namespaced].symbols["MyNamespace.MyClass"].dependents,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[semiNamespaced].symbols["HalfNamespace.Gordon"].dependents,
      ).length,
    ).toBe(2);
    expect(
      Object.keys(manifest[semiNamespaced].symbols["Freeman"].dependents)
        .length,
    ).toBe(2);
    expect(
      Object.keys(
        manifest[nested].symbols["OuterNamespace.OuterInnerClass"].dependents,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[nested].symbols["OuterNamespace.InnerNamespace.InnerClass"]
          .dependents,
      ).length,
    ).toBe(1);
    expect(
      Object.keys(
        manifest[models].symbols["MyApp.Models.OrderStatus"].dependents,
      ).length,
    ).toBe(1);
  });
});
