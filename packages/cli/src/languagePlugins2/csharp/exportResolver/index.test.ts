import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { CsharpExportResolver } from ".";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

describe("CsharpExportResolver", () => {
  let resolver: CsharpExportResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    files = new Map([
      [
        "project/MyClass.cs",
        {
          path: "project/MyClass.cs",
          rootNode: csharpParser.parse(`
            public class MyClass
            {
            }
            `).rootNode,
        },
      ],
      [
        "project/Models.cs",
        {
          path: "project/Models.cs",
          rootNode: csharpParser.parse(`
              public class User
              {
                public string Name { get; set; }
              }
              public struct Order
              {
                public int OrderId;
                public string Description;
              }
              public enum OrderStatus
              {
                Pending,
                Completed
              }
              `).rootNode,
        },
      ],
      [
        "project/empty.cs",
        {
          path: "project/empty.cs",
          rootNode: csharpParser.parse("").rootNode,
        },
      ],
      [
        "project/Nested.cs",
        {
          path: "project/Nested.cs",
          rootNode: csharpParser.parse(`
            public class OuterClass
            {
              public class InnerClass
              {
                public void InnerMethod()
                {
                }
              }
              public void OuterMethod()
              {
              }
              `).rootNode,
        },
      ],
    ]);
    resolver = new CsharpExportResolver(csharpParser, files);
  });

  test("getSymbols", () => {
    const symbols = resolver.getSymbols("project/MyClass.cs");
    expect(symbols).toEqual([
      {
        id: "MyClass",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "class",
      },
    ]);
  });

  test("getSymbols", () => {
    const symbols = resolver.getSymbols("project/Models.cs");
    expect(symbols).toEqual([
      {
        id: "User",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "class",
      },
      {
        id: "Order",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "struct",
      },
      {
        id: "OrderStatus",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "enum",
      },
    ]);
  });

  test("getSymbols", () => {
    const symbols = resolver.getSymbols("project/empty.cs");
    expect(symbols).toEqual([]);
  });

  test("getSymbols", () => {
    const symbols = resolver.getSymbols("project/Nested.cs");
    expect(symbols).toEqual([
      {
        id: "OuterClass",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "class",
      },
      {
        id: "InnerClass",
        node: expect.any(Object),
        identifierNode: expect.any(Object),
        type: "class",
      },
    ]);
  });
});
