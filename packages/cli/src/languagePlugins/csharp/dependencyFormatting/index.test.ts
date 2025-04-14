import { describe, test, expect } from "vitest";
import { CSharpDependencyFormatter } from ".";
import {
  getCSharpFilesMap,
  csharpFilesFolder,
  getCsprojFilesMap,
} from "../testFiles";
import path from "path";
import { File } from "../namespaceResolver";

describe("Dependency formatting", () => {
  const parsedfiles: Map<string, File> = getCSharpFilesMap();
  const csprojfiles = getCsprojFilesMap();
  const formatter = new CSharpDependencyFormatter(parsedfiles, csprojfiles);

  test("SemiNamespaced.cs", () => {
    const snpath = path.join(csharpFilesFolder, "SemiNamespaced.cs");
    const seminamespaced = formatter.formatFile(snpath);
    expect(seminamespaced).toBeDefined();
    if (!seminamespaced) return;
    expect(seminamespaced.id).toBe(snpath);
    expect(seminamespaced.dependencies[snpath]).toBeDefined();
    expect(Object.keys(seminamespaced.symbols).length).toBe(3);
  });
});
