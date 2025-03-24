import { describe, test, expect } from "vitest";
import { generateCSharpDependencyManifesto } from ".";
import { getCSharpFilesMap } from "../../../languagePlugins/csharp/testFiles";

describe("CSharpDependencyManifesto", function () {
  const files = getCSharpFilesMap();
  const manifesto = generateCSharpDependencyManifesto(files);
  test("should generate a dependency manifesto for CSharp files", () => {
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

  test("Dependents are recorded", () => {
    const dependents = manifesto["Namespaced.cs"].symbols["MyClass"].dependents;
    expect(Object.keys(dependents).length).toBe(1);
    expect(dependents["Program.cs"].symbols["Program"]).toBe("Program");
  });

  // TODO
  // test("should handle external dependencies", () => {
  //   expect(manifesto["Program.cs"].dependencies["System"].isExternal).toBe(true);
  // });
});
