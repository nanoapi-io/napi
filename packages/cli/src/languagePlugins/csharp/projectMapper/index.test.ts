import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CSharpProjectMapper } from "./index.ts";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../testFiles/index.ts";
import { CSharpUsingResolver } from "../usingResolver/index.ts";
import { CSharpNamespaceMapper } from "../namespaceMapper/index.ts";
import { join } from "@std/path";

describe("CSharpProjectMapper", () => {
  const csprojfiles = getCsprojFilesMap();
  const parsedfiles = getCSharpFilesMap();
  const projectMapper = new CSharpProjectMapper(csprojfiles);

  test("Project mapper definition", () => {
    expect(projectMapper.rootFolder).toBeDefined();
    expect(projectMapper.subprojects).toBeDefined();
    expect(projectMapper.subprojects.length).toBe(2);
  });

  const nsmapper = new CSharpNamespaceMapper(parsedfiles);
  const usingResolver = new CSharpUsingResolver(nsmapper, projectMapper);
  const usagecsFile = join(csharpFilesFolder, "Usage.cs");
  const globalusingcsFile = join(
    csharpFilesFolder,
    "Subfolder/GlobalUsings.cs",
  );
  test("Global using resolution", () => {
    usingResolver.resolveUsingDirectives(usagecsFile);
    usingResolver.resolveUsingDirectives(globalusingcsFile);
    expect(usingResolver.getGlobalUsings(usagecsFile).internal.length).toBe(0);
    expect(usingResolver.getGlobalUsings(usagecsFile).external.length).toBe(1);
    expect(
      usingResolver.getGlobalUsings(globalusingcsFile).internal.length,
    ).toBe(1);
    expect(
      usingResolver.getGlobalUsings(globalusingcsFile).external.length,
    ).toBe(1);
  });
});
