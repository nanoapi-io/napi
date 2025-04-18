import { describe, expect, test } from "vitest";
import { File } from "../namespaceResolver";
import { CSharpNamespaceMapper, SymbolNode } from "../namespaceMapper";
import { CSharpNamespaceResolver } from "../namespaceResolver";
import {
  getCSharpFilesMap,
  csharpFilesFolder,
  getCsprojFilesMap,
} from "../testFiles";
import path from "path";
import { CSharpInvocationResolver } from ".";
import Parser from "tree-sitter";
import { CSharpProjectMapper } from "../projectMapper";

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
      path.join(csharpFilesFolder, "Program.cs"),
    );
    expect(usedFiles).toMatchObject({
      resolvedSymbols: [
        {
          name: "Bun",
          type: "class",
          namespace: "MyApp.BeefBurger",
        },
        {
          name: "Bun",
          type: "class",
          namespace: "ChickenBurger",
        },
        {
          name: "MyClass",
          type: "class",
          namespace: "MyNamespace",
        },
        {
          name: "Gordon",
          type: "class",
          namespace: "HalfNamespace",
        },
        {
          name: "Freeman",
          type: "class",
          namespace: "",
        },
        {
          name: "OuterInnerClass",
          type: "class",
          namespace: "OuterNamespace",
        },
        {
          name: "InnerClass",
          type: "class",
          namespace: "OuterNamespace.InnerNamespace",
        },
        {
          name: "OrderStatus",
          type: "enum",
          namespace: "MyApp.Models",
        },
        {
          name: "HeadCrab",
          type: "class",
          namespace: "",
        },
      ],
      unresolved: ["System.Math"],
    });
  });

  test("isUsedInFile", () => {
    const myclass: SymbolNode = {
      name: "MyClass",
      type: "class",
      filepath: path.join(csharpFilesFolder, "Namespaced.cs"),
      namespace: "MyNamespace",
      node: {} as Parser.SyntaxNode,
    };
    const headcrab: SymbolNode = {
      name: "HeadCrab",
      type: "class",
      filepath: path.join(csharpFilesFolder, "SemiNamespaced.cs"),
      namespace: "",
      node: {} as Parser.SyntaxNode,
    };
    const iorder: SymbolNode = {
      name: "IOrder",
      type: "interface",
      filepath: path.join(csharpFilesFolder, "Models.cs"),
      namespace: "MyApp.Models",
      node: {} as Parser.SyntaxNode,
    };
    expect(
      invResolver.isUsedInFile(
        path.join(csharpFilesFolder, "Program.cs"),
        myclass,
      ),
    ).toBe(true);
    expect(
      invResolver.isUsedInFile(
        path.join(csharpFilesFolder, "Program.cs"),
        headcrab,
      ),
    ).toBe(true);
    expect(
      invResolver.isUsedInFile(
        path.join(csharpFilesFolder, "Program.cs"),
        iorder,
      ),
    ).toBe(false);
  });

  test("Same-file dependencies", () => {
    const seminamespaced = nsResolver.getNamespacesFromFile(
      parsedfiles.get(
        path.join(csharpFilesFolder, "SemiNamespaced.cs"),
      ) as File,
    );
    const headcrabnode = seminamespaced[0].exports.find(
      (exp) => exp.name === "HeadCrab",
    )?.node as Parser.SyntaxNode;
    const hcinvocations = invResolver.getInvocationsFromNode(
      headcrabnode,
      path.join(csharpFilesFolder, "SemiNamespaced.cs"),
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
});
