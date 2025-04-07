import { describe, test, expect } from "vitest";
import { CSharpDependencyFormatter } from ".";
import { getCSharpFilesMap, csharpFilesFolder } from "../testFiles";
import path from "path";
import { File } from "../namespaceResolver";

describe("Dependency formatting", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const formatter = new CSharpDependencyFormatter(files);

  test("SemiNamespaced.cs", () => {
    expect(
      formatter.formatFile(path.join(csharpFilesFolder, "SemiNamespaced.cs")),
    ).toMatchObject({
      id: path.join(csharpFilesFolder, "SemiNamespaced.cs"),
      dependencies: {
        "": {
          id: "",
          isExternal: false,
          symbols: {
            Freeman: "Freeman",
          },
          isNamespace: true,
        },
        // Commented, check comments at line 110 of index.ts.
        // Console: {
        //   id: "Console",
        //   isExternal: true,
        // },
      },
      symbols: {
        Freeman: {
          id: "Freeman",
          type: "class",
          dependents: {},
        },
        HeadCrab: {
          id: "HeadCrab",
          type: "class",
          dependents: {},
        },
        "HalfNamespace.Gordon": {
          id: "Gordon",
          type: "class",
          dependents: {},
        },
      },
    });
  });
});
