import { describe, test, expect } from "vitest";
import { CSharpDependencyFormatter } from ".";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("Dependency formatting", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const formatter = new CSharpDependencyFormatter(files);

  test("SemiNamespaced.cs", () => {
    expect(formatter.formatFile("SemiNamespaced.cs")).toMatchObject({
      id: "SemiNamespaced.cs",
      filepath: "SemiNamespaced.cs",
      dependencies: {
        Freeman: {
          id: "Freeman",
          isExternal: false,
        },
        Console: {
          id: "Console",
          isExternal: true,
        },
      },
      symbols: {
        Freeman: {
          id: "Freeman",
          type: "class",
          dependents: {
            "Program.cs": {
              id: "Program.cs",
              symbols: {
                Program: "Program",
              },
            },
            "SemiNamespaced.cs": {
              id: "SemiNamespaced.cs",
              symbols: {
                HeadCrab: "HeadCrab",
              },
            },
          },
        },
        HeadCrab: {
          id: "HeadCrab",
          type: "class",
          dependents: {},
        },
        Gordon: {
          id: "Gordon",
          type: "class",
          dependents: {
            "Program.cs": {
              id: "Program.cs",
              symbols: {
                Program: "Program",
              },
            },
          },
        },
      },
    });
  });
});
