import { describe, expect, test } from "vitest";
import { CSharpExtractor } from "./index.ts";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../testFiles/index.ts";
import { generateCSharpDependencyManifest } from "../../../manifest/dependencyManifest/csharp/index.ts";
import path from "node:path";

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

  const programpath = path.join(csharpFilesFolder, "Program.cs");
  const twonamespacesonefilepath = path.join(
    csharpFilesFolder,
    "2Namespaces1File.cs",
  );
  const seminamespacedpath = path.join(csharpFilesFolder, "SemiNamespaced.cs");

  test("should extract symbols correctly", () => {
    expect(
      extractor.extractSymbolFromFile(programpath, "Program")?.length,
    ).toBe(10);
    const salad = extractor.extractSymbolFromFile(
      twonamespacesonefilepath,
      "ChickenBurger.Salad",
    );
    expect(salad?.length).toBe(1);
    const saladfile = salad?.[0];
    expect(saladfile?.name).toBe("Salad");
    expect(saladfile?.namespace).toBe("ChickenBurger");
    expect(saladfile?.subproject.name).toBe("TestFiles");
    expect(saladfile?.symbol).toMatchObject({
      name: "Salad",
      type: "class",
      namespace: "ChickenBurger",
    });
    expect(
      extractor.extractSymbolFromFile(
        twonamespacesonefilepath,
        "MyApp.BeefBurger.Steak",
      )?.length,
    ).toBe(2);
    expect(
      extractor.extractSymbolFromFile(seminamespacedpath, "HeadCrab")?.length,
    ).toBe(2);
  });

  test("should extract global using directives", () => {
    const project = extractor.projectMapper.findSubprojectForFile(
      path.join(csharpFilesFolder, "Program.cs"),
    );
    if (!project) {
      throw new Error("Project not found");
    }
    const usingDirectives = extractor.generateGlobalUsings(project);
    expect(usingDirectives.startsWith("global using System.IO;")).toBe(true);

    const subproject = extractor.projectMapper.findSubprojectForFile(
      path.join(csharpFilesFolder, "Subfolder/GlobalUsings.cs"),
    );
    if (!subproject) {
      throw new Error("Subproject not found");
    }
    const subprojectUsingDirectives = extractor.generateGlobalUsings(
      subproject,
    );
    expect(subprojectUsingDirectives.includes("global using System;")).toBe(
      true,
    );
    expect(
      subprojectUsingDirectives.includes("global using MyApp.Models;"),
    ).toBe(true);
  });

  test("should manage nested classes", () => {
    const extracted = extractor.extractSymbolFromFile(programpath, "Program");
    const symbols = extracted?.map((file) =>
      file.symbol.namespace !== ""
        ? file.symbol.namespace + "." + file.symbol.name
        : file.symbol.name
    );
    expect(symbols).not.toContain("OuterNamespace.OuterInnerClass");
    expect(symbols).toContain("OuterNamespace.OuterClass");
  });
});
