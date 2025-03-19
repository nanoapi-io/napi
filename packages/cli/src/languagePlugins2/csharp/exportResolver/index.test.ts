import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { CsharpExportResolver } from ".";
import { csharpParser } from "../../../helpers/treeSitter/parsers";

describe("CsharpExportResolver", () => {
  let resolver: CsharpExportResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    try {
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
      ]);
      resolver = new CsharpExportResolver(files);
    } catch (error) {
      console.error("Error in beforeEach:", error);
      throw error;
    }
  });

  test("MyClass.cs", () => {
    try {
      const symbols = resolver.getSymbols("project/MyClass.cs");
      expect(symbols).toMatchObject([
        {
          id: "MyClass",
          identifierNode: { text: "MyClass" },
          type: "class",
        },
      ]);
    } catch (error) {
      console.error("Error in test MyClass.cs:", error);
      throw error;
    }
  });

  test("Models.cs", () => {
    try {
      const symbols = resolver.getSymbols("project/Models.cs");
      expect(symbols).toMatchObject([
        {
          id: "User",
          identifierNode: { text: "User" },
          type: "class",
        },
        {
          id: "Order",
          identifierNode: { text: "Order" },
          type: "class",
        },
        {
          id: "OrderStatus",
          identifierNode: { text: "OrderStatus" },
          type: "class",
        },
      ]);
    } catch (error) {
      console.error("Error in test Models.cs:", error);
      throw error;
    }
  });

  test("empty.cs", () => {
    try {
      const symbols = resolver.getSymbols("project/empty.cs");
      expect(symbols).toEqual([]);
    } catch (error) {
      console.error("Error in test empty.cs:", error);
      throw error;
    }
  });

  test("Nested.cs", () => {
    try {
      const symbols = resolver.getSymbols("project/Nested.cs");
      expect(symbols).toMatchObject([
        {
          id: "OuterClass",
          identifierNode: { text: "OuterClass" },
          type: "class",
        },
        {
          id: "InnerClass",
          identifierNode: { text: "InnerClass" },
          type: "class",
        },
        {
          id: "InnerMethod",
          identifierNode: { text: "InnerMethod" },
          type: "method",
        },
        {
          id: "OuterMethod",
          identifierNode: { text: "OuterMethod" },
          type: "method",
        },
      ]);
    } catch (error) {
      console.error("Error in test Nested.cs:", error);
      throw error;
    }
  });
});
