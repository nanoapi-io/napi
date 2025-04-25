import { describe, test, expect } from "vitest";
import { CSharpExtractor } from "./index.js";
import {
  getCSharpFilesMap,
  getCsprojFilesMap,
  csharpFilesFolder,
} from "../testFiles/index.js";
import { generateCSharpDependencyManifest } from "../../../manifest/dependencyManifest/csharp/index.js";
import path from "path";

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
    ).toBe(9);
    expect(
      extractor.extractSymbolFromFile(
        twonamespacesonefilepath,
        "ChickenBurger.Salad",
      )?.length,
    ).toBe(1);
    expect(
      extractor.extractSymbolFromFile(
        twonamespacesonefilepath,
        "MyApp.BeefBurger.Steak",
      )?.length,
    ).toBe(1);
    expect(
      extractor.extractSymbolFromFile(seminamespacedpath, "HeadCrab")?.length,
    ).toBe(2);
  });

  test("should extract global using directives", () => {
    const project = extractor.projectMapper.findSubprojectForFile(
      path.join(csharpFilesFolder, "Program.cs"),
    );
    const usingDirectives = extractor.generateGlobalUsings(project);
    expect(usingDirectives.startsWith("global using System.IO;")).toBe(true);

    const subproject = extractor.projectMapper.findSubprojectForFile(
      path.join(csharpFilesFolder, "Subfolder/GlobalUsings.cs"),
    );
    const subprojectUsingDirectives =
      extractor.generateGlobalUsings(subproject);
    expect(subprojectUsingDirectives.includes("global using System;")).toBe(
      true,
    );
    expect(
      subprojectUsingDirectives.includes("global using MyApp.Models;"),
    ).toBe(true);
  });
});
