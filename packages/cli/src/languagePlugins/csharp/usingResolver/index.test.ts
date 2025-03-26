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

  test("Directive simple parsing", () => {
    const usingDirectives = resolver.parseUsingDirectives("Usage.cs");
    expect(usingDirectives).toMatchObject([
      {
        type: GLOBAL_USING,
        id: "System.IO",
      },
      {
        type: LOCAL_USING,
        id: "System",
      },
      {
        type: LOCAL_USING,
        id: "System.Collections.Generic",
      },
      {
        type: USING_STATIC,
        id: "System.Math",
      },
      {
        type: USING_ALIAS,
        id: "MyApp.Models.User",
        alias: "Guy",
      },
      {
        type: USING_ALIAS,
        id: "HalfNamespace",
        alias: "Valve",
      },
    ]);
  });
  test("Directive resolving", () => {
    const resolved = resolver.resolveUsingDirectives("Usage.cs");
    expect(resolved).toMatchObject({
      internal: [
        {
          usingtype: USING_ALIAS,
          alias: "Guy",
          symbol: {
            name: "User",
            type: "class",
            namespace: "MyApp.Models",
            filepath: "Models.cs",
          },
        },
        {
          usingtype: USING_ALIAS,
          alias: "Valve",
          namespace: {
            name: "HalfNamespace",
            exports: expect.any(Array),
            childrenNamespaces: expect.any(Array),
          },
        },
      ],
      external: [
        {
          usingtype: GLOBAL_USING,
          name: "System.IO",
        },
        {
          usingtype: LOCAL_USING,
          name: "System",
        },
        {
          usingtype: LOCAL_USING,
          name: "System.Collections.Generic",
        },
        {
          usingtype: USING_STATIC,
          name: "System.Math",
        },
      ],
    });
  });
});
