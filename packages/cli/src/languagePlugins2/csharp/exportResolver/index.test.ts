import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { CsharpExportResolver } from ".";
import { getCSharpFilesMap } from "../testFiles";

describe("CsharpExportResolver", () => {
  let resolver: CsharpExportResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    try {
      files = getCSharpFilesMap();
      resolver = new CsharpExportResolver(files);
    } catch (error) {
      console.error("Error in beforeEach:", error);
      throw error;
    }
  });

  test("Namespaced.cs", () => {
    try {
      const symbols = resolver.getSymbols("Namespaced.cs");
      expect(symbols).toEqual(
        expect.arrayContaining([
          {
            id: "MyClass",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "MyClass" }),
            type: "class",
          },
        ]),
      );
    } catch (error) {
      console.error("Error in test Namespaced.cs:", error);
      throw error;
    }
  });

  test("Models.cs", () => {
    try {
      const symbols = resolver.getSymbols("Models.cs");
      expect(symbols).toEqual(
        expect.arrayContaining([
          {
            id: "User",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "User" }),
            type: "class",
          },
          {
            id: "Order",
            node: expect.objectContaining({ type: "struct_declaration" }),
            identifierNode: expect.objectContaining({ text: "Order" }),
            type: "struct",
          },
          {
            id: "OrderStatus",
            node: expect.objectContaining({ type: "enum_declaration" }),
            identifierNode: expect.objectContaining({ text: "OrderStatus" }),
            type: "enum",
          },
        ]),
      );
    } catch (error) {
      console.error("Error in test Models.cs:", error);
      throw error;
    }
  });

  test("Variables.cs", () => {
    try {
      const symbols = resolver.getSymbols("Variables.cs");
      expect(symbols).toEqual(
        expect.arrayContaining([
          {
            id: "FarWest",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "FarWest" }),
            type: "class",
          },
          {
            id: "EastCoast",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "EastCoast" }),
            type: "class",
          },
        ]),
      );
    } catch (error) {
      console.error("Error in test Variables.cs:", error);
      throw error;
    }
  });

  test("SemiNamespaced.cs", () => {
    try {
      const symbols = resolver.getSymbols("SemiNamespaced.cs");
      expect(symbols).toEqual(
        expect.arrayContaining([
          {
            id: "Gordon",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "Gordon" }),
            type: "class",
          },
          {
            id: "Freeman",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "Freeman" }),
            type: "class",
          },
          {
            id: "HeadCrab",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "HeadCrab" }),
            type: "class",
          },
        ]),
      );
    } catch (error) {
      console.error("Error in test SemiNamespaced.cs:", error);
      throw error;
    }
  });

  test("IWillOnlyImportHalf.cs", () => {
    try {
      const symbols = resolver.getSymbols("IWillOnlyImportHalf.cs");
      expect(symbols).toEqual(
        expect.arrayContaining([
          {
            id: "Steak",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "Steak" }),
            type: "class",
          },
          {
            id: "Salad",
            node: expect.objectContaining({ type: "class_declaration" }),
            identifierNode: expect.objectContaining({ text: "Salad" }),
            type: "class",
          },
        ]),
      );
    } catch (error) {
      console.error("Error in test IWillOnlyImportHalf.cs:", error);
      throw error;
    }
  });
});
