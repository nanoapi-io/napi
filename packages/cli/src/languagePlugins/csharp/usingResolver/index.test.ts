import { describe, test, expect } from "vitest";
import {
  CSharpUsingResolver,
  GLOBAL_USING,
  LOCAL_USING,
  USING_ALIAS,
  USING_STATIC,
} from ".";
import { CSharpNamespaceMapper } from "../namespaceMapper";
import { getCSharpFilesMap } from "../testFiles";
import { File } from "../namespaceResolver";

describe("UsingResolver", () => {
  const files: Map<string, File> = getCSharpFilesMap();
  const nsmapper = new CSharpNamespaceMapper(files);
  const resolver = new CSharpUsingResolver(nsmapper);

  test("Should resolve all use cases of 'using'", () => {
    const usingDirectives = resolver.parseUsingDirectives("Usage.cs");
    expect(usingDirectives).toMatchObject([
      {
        type: GLOBAL_USING,
        import: "System.IO",
      },
      {
        type: LOCAL_USING,
        import: "System",
      },
      {
        type: LOCAL_USING,
        import: "System.Collections.Generic",
      },
      {
        type: USING_STATIC,
        import: "System.Math",
      },
      {
        type: USING_ALIAS,
        import: "MyApp.Models.User",
        alias: "Guy",
      },
      {
        type: USING_ALIAS,
        import: "HalfNamespace",
        alias: "Valve",
      },
    ]);
  });
});
