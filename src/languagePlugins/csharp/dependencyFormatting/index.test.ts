import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CSharpDependencyFormatter } from "./index.ts";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../testFiles/index.ts";
import { join } from "@std/path";
import type { File } from "../namespaceResolver/index.ts";

describe("Dependency formatting", () => {
  const parsedfiles: Map<string, File> = getCSharpFilesMap();
  const csprojfiles = getCsprojFilesMap();
  const formatter = new CSharpDependencyFormatter(parsedfiles, csprojfiles);

  test("SemiNamespaced.cs", () => {
    const snpath = join(csharpFilesFolder, "SemiNamespaced.cs");
    const seminamespaced = formatter.formatFile(snpath);
    expect(seminamespaced).toBeDefined();
    if (!seminamespaced) return;
    expect(seminamespaced.id).toBe(snpath);
    expect(seminamespaced.dependencies[snpath]).toBeDefined();
    expect(Object.keys(seminamespaced.symbols).length).toBe(3);
  });
});
