import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifesto } from ".";
import { getCSharpFilesMap } from "../../../languagePlugins/csharp/testFiles";

describe("CSharpDependencyManifesto", function () {
  test("should generate a dependency manifesto for CSharp files", () => {
    const files = getCSharpFilesMap();
    const manifesto = generateCSharpDependencyManifesto(files);

    expect(manifesto).toBeDefined();
    expect(Object.keys(manifesto).length).toBe(6);
    expect(Object.keys(manifesto["Program.cs"].symbols).length).toBe(1);
    expect(Object.keys(manifesto["Program.cs"].dependencies).length).toBe(8);
    expect(
      Object.keys(
        manifesto["Program.cs"].symbols["Program"].dependencies["Namespaced.cs"]
          .symbols,
      ).length,
    ).toBe(1);
  });
});
