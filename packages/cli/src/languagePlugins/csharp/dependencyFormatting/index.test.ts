import { describe, test, expect } from "vitest";
import { CSharpDependencyFormatter } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("Dependency formatting", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const formatter = new CSharpDependencyFormatter(files);

  test("Format dependencies", () => {
    console.log(formatter.formatFile("Program.cs"));
  });
});
