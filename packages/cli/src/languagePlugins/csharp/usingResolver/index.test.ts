import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  CSharpUsingResolver,
  ExternalSymbol,
  GLOBAL_USING,
  InternalSymbol,
  LOCAL_USING,
  USING_ALIAS,
  USING_CURRENT,
  USING_STATIC,
} from "./index.ts";
import { CSharpNamespaceMapper } from "../namespaceMapper/index.ts";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../testFiles/index.ts";
import path from "node:path";
import type { File } from "../namespaceResolver/index.ts";
import { CSharpProjectMapper } from "../projectMapper/index.ts";

describe("UsingResolver", () => {
  const parsedfiles: Map<string, File> = getCSharpFilesMap();
  const csprojfiles = getCsprojFilesMap();
  const nsmapper = new CSharpNamespaceMapper(parsedfiles);
  const projectMapper = new CSharpProjectMapper(csprojfiles);
  const resolver = new CSharpUsingResolver(nsmapper, projectMapper);

  test("Directive simple parsing", () => {
    const usingDirectives = resolver.parseUsingDirectives(
      path.join(csharpFilesFolder, "Usage.cs"),
    );
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
    const resolved = resolver.resolveUsingDirectives(
      path.join(csharpFilesFolder, "Usage.cs"),
    );
    expect(resolved).toMatchObject({
      internal: [
        {
          usingtype: USING_ALIAS,
          alias: "Guy",
          symbol: {
            name: "User",
            type: "class",
            namespace: "MyApp.Models",
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
        {
          usingtype: USING_CURRENT,
          namespace: {
            name: "",
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

  test("Class resolution", () => {
    const filepath = path.join(csharpFilesFolder, "Usage.cs");
    const imports = resolver.resolveUsingDirectives(filepath);
    const user = resolver.findClassInImports(imports, "User", filepath);
    expect(user).toMatchObject({
      name: "User",
      type: "class",
      namespace: "MyApp.Models",
    });
    const gordon = resolver.findClassInImports(imports, "Gordon", filepath);
    expect(gordon).toMatchObject({
      name: "Gordon",
      type: "class",
      namespace: "HalfNamespace",
    });
    const guy = resolver.findClassInImports(imports, "Guy", filepath);
    expect(guy).toMatchObject({
      name: "User",
      type: "class",
      namespace: "MyApp.Models",
    });
  });

  test("Current namespace resolution", () => {
    const filepath = path.join(csharpFilesFolder, "Models.cs");
    const imports = resolver.resolveUsingDirectives(filepath).internal;
    expect(imports).toMatchObject([
      {
        usingtype: USING_CURRENT,
        namespace: {
          name: "Models",
          exports: expect.any(Array),
          childrenNamespaces: expect.any(Array),
        },
      },
      {
        usingtype: USING_CURRENT,
        namespace: {
          name: "",
          exports: expect.any(Array),
          childrenNamespaces: expect.any(Array),
        },
      },
    ]);
  });

  test("instanceof functions correctly", () => {
    const filepath = path.join(csharpFilesFolder, "Usage.cs");
    const directives = resolver.parseUsingDirectives(filepath);
    expect(
      directives.filter(
        (d) => resolver.resolveUsingDirective(d) instanceof ExternalSymbol,
      ).length,
    ).toBe(4);
    expect(
      directives.filter(
        (d) => resolver.resolveUsingDirective(d) instanceof InternalSymbol,
      ).length,
    ).toBe(2);

    const programpath = path.join(csharpFilesFolder, "Program.cs");
    const progDirectives = resolver.parseUsingDirectives(programpath);
    expect(
      progDirectives.filter(
        (d) => resolver.resolveUsingDirective(d) instanceof ExternalSymbol,
      ).length,
    ).toBe(0);
    expect(
      progDirectives.filter(
        (d) => resolver.resolveUsingDirective(d) instanceof InternalSymbol,
      ).length,
    ).toBe(6);
  });
});
