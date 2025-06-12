import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type { File } from "../namespaceResolver/index.ts";
import {
  CSharpNamespaceMapper,
  type SymbolNode,
} from "../namespaceMapper/index.ts";
import { CSharpNamespaceResolver } from "../namespaceResolver/index.ts";
import {
  csharpFilesFolder,
  getCSharpFilesMap,
  getCsprojFilesMap,
} from "../testFiles/index.ts";
import { join } from "@std/path";
import { CSharpInvocationResolver } from "./index.ts";
import type Parser from "tree-sitter";
import { CSharpProjectMapper } from "../projectMapper/index.ts";

describe("InvocationResolver", () => {
  const parsedfiles: Map<string, File> = getCSharpFilesMap();
  const csprojfiles = getCsprojFilesMap();
  const nsMapper = new CSharpNamespaceMapper(parsedfiles);
  const projectMapper = new CSharpProjectMapper(csprojfiles);
  const nsResolver = new CSharpNamespaceResolver();
  const invResolver: CSharpInvocationResolver = new CSharpInvocationResolver(
    nsMapper,
    projectMapper,
  );

  test("Invocation resolution", () => {
    const usedFiles = invResolver.getInvocationsFromFile(
      join(csharpFilesFolder, "Program.cs"),
    );
    const resolved = usedFiles.resolvedSymbols.map((s) =>
      s.namespace !== "" ? s.namespace + "." + s.name : s.name
    );
    const unresolved = usedFiles.unresolved;
    expect(resolved).toContain("MyApp.BeefBurger.Bun");
    expect(resolved).toContain("ChickenBurger.Bun");
    expect(resolved).toContain("ChickenBurger.Salad");
    expect(resolved).toContain("MyNamespace.MyClass");
    expect(resolved).toContain("HalfNamespace.Gordon");
    expect(resolved).toContain("Freeman");
    expect(resolved).toContain("OuterNamespace.InnerNamespace.InnerClass");
    expect(resolved).toContain("MyApp.Models.OrderStatus");
    expect(resolved).toContain("HeadCrab"); // Used through extension Bite()
    expect(resolved).toContain("OuterNamespace.OuterInnerClass");
    expect(resolved).not.toContain("MyApp.BeefBurger.Salad");
    expect(unresolved).toContain("System.Math");
    expect(unresolved).not.toContain("string");
    expect(unresolved).not.toContain("System");
    expect(unresolved).not.toContain("Salad<string>");
  });

  test("isUsedInFile", () => {
    const myclass: SymbolNode = {
      name: "MyClass",
      type: "class",
      filepath: join(csharpFilesFolder, "Namespaced.cs"),
      namespace: "MyNamespace",
      node: {} as Parser.SyntaxNode,
    };
    const headcrab: SymbolNode = {
      name: "HeadCrab",
      type: "class",
      filepath: join(csharpFilesFolder, "SemiNamespaced.cs"),
      namespace: "",
      node: {} as Parser.SyntaxNode,
    };
    const iorder: SymbolNode = {
      name: "IOrder",
      type: "interface",
      filepath: join(csharpFilesFolder, "Models.cs"),
      namespace: "MyApp.Models",
      node: {} as Parser.SyntaxNode,
    };
    expect(
      invResolver.isUsedInFile(
        join(csharpFilesFolder, "Program.cs"),
        myclass,
      ),
    ).toBe(true);
    expect(
      invResolver.isUsedInFile(
        join(csharpFilesFolder, "Program.cs"),
        headcrab,
      ),
    ).toBe(true);
    expect(
      invResolver.isUsedInFile(
        join(csharpFilesFolder, "Program.cs"),
        iorder,
      ),
    ).toBe(false);
  });

  test("Same-file dependencies", () => {
    const seminamespaced = nsResolver.getNamespacesFromFile(
      parsedfiles.get(
        join(csharpFilesFolder, "SemiNamespaced.cs"),
      ) as File,
    );
    const headcrabnode = seminamespaced[0].exports.find(
      (exp) => exp.name === "HeadCrab",
    )?.node as Parser.SyntaxNode;
    const hcinvocations = invResolver.getInvocationsFromNode(
      headcrabnode,
      join(csharpFilesFolder, "SemiNamespaced.cs"),
    );
    expect(hcinvocations).toMatchObject({
      resolvedSymbols: [
        {
          name: "Freeman",
          type: "class",
          namespace: "",
        },
      ],
      unresolved: [],
    });
  });

  test("Finds useless using directives", () => {
    const filepath = join(csharpFilesFolder, "2Namespaces1File.cs");
    const usingDirectives = invResolver.usingResolver.parseUsingDirectives(
      filepath,
    );
    const invocations = invResolver.getInvocationsFromFile(filepath);
    expect(usingDirectives.length).toBe(2);
    expect(
      usingDirectives.filter((d) => invResolver.isUsingUseful(invocations, d))
        .length,
    ).toBe(1);

    const programpath = join(csharpFilesFolder, "Program.cs");
    const programUsingDirectives = invResolver.usingResolver
      .parseUsingDirectives(programpath);
    const programInvocations = invResolver.getInvocationsFromFile(programpath);
    expect(programUsingDirectives.length).toBe(6);
    expect(
      programUsingDirectives.filter((d) =>
        invResolver.isUsingUseful(programInvocations, d)
      ).length,
    ).toBe(6);

    const usagepath = join(csharpFilesFolder, "Usage.cs");
    const usageUsingDirectives = invResolver.usingResolver.parseUsingDirectives(
      usagepath,
    );
    const usageInvocations = invResolver.getInvocationsFromFile(usagepath);
    expect(usageUsingDirectives.length).toBe(6);
    expect(
      usageUsingDirectives.filter((d) =>
        invResolver.isUsingUseful(usageInvocations, d)
      ).length,
    ).toBe(4);

    const globalusingpath = join(
      csharpFilesFolder,
      "Subfolder/GlobalUsings.cs",
    );
    const globalusingDirectives = invResolver.usingResolver
      .parseUsingDirectives(globalusingpath);
    const globalusingInvocations = invResolver.getInvocationsFromFile(
      globalusingpath,
    );
    expect(globalusingDirectives.length).toBe(2);
    expect(
      globalusingDirectives.filter((d) =>
        invResolver.isUsingUseful(globalusingInvocations, d)
      )
        .length,
    ).toBe(1); // Every external import is considered useful no matter what
    // Even if there is no invocation.
    // It's also not dangerous to remove a global using directive
    // because they are regrouped in GlobalUsings.cs.
  });
});
