import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { PythonExportResolver } from ".";
import { pythonParser } from "../../../helpers/treeSitter/parsers";

describe("PythonExportResolver", () => {
  let resolver: PythonExportResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    files = new Map([
      [
        "project/module.py",
        {
          path: "project/module.py",
          rootNode: pythonParser.parse(`
            class MyClass:
                pass

            @decorator
            class DecoratedClass:
                pass

            def my_function():
                pass

            @decorator
            def decorated_function():
                pass

            variable_a = 42
            variable_b, variable_c = 10, 20
          `).rootNode,
        },
      ],
      [
        "project/empty.py",
        {
          path: "project/empty.py",
          rootNode: pythonParser.parse("").rootNode,
        },
      ],
      [
        "project/complex.py",
        {
          path: "project/complex.py",
          rootNode: pythonParser.parse(`
            class OuterClass:
                class InnerClass:
                    def inner_method(self):
                        pass
  
                def inner_method(self):
                    pass
  
            def outer_function():
                def inner_function():
                    pass
                return inner_function
  
            CONSTANT = "value"
          `).rootNode,
        },
      ],
      [
        "project/module_with_all.py",
        {
          path: "project/module_with_all.py",
          rootNode: pythonParser.parse(`
            __all__ = ["exported_function", "ExportedClass"]
  
            class ExportedClass:
                pass
  
            def exported_function():
                pass
  
            some_variable = "should be detected"
          `).rootNode,
        },
      ],
    ]);

    resolver = new PythonExportResolver(pythonParser, files);
  });

  // Test class extraction
  test("should extract classes from a module", () => {
    const symbols = resolver.getSymbols("project/module.py");

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "MyClass", type: "class" }),
        expect.objectContaining({ id: "DecoratedClass", type: "class" }),
      ]),
    );
  });

  // Test function extraction
  test("should extract functions from a module", () => {
    const symbols = resolver.getSymbols("project/module.py");

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "my_function", type: "function" }),
        expect.objectContaining({ id: "decorated_function", type: "function" }),
      ]),
    );
  });

  // Test variable extraction
  test("should extract top-level variables", () => {
    const symbols = resolver.getSymbols("project/module.py");
    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "variable_a", type: "variable" }),
        expect.objectContaining({ id: "variable_b", type: "variable" }),
        expect.objectContaining({ id: "variable_c", type: "variable" }),
      ]),
    );
  });

  // Test mixed extraction
  test("should extract all symbols from a module", () => {
    const symbols = resolver.getSymbols("project/complex.py");

    expect(symbols.length).toBe(3);
    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "OuterClass", type: "class" }),
        expect.objectContaining({ id: "outer_function", type: "function" }),
        expect.objectContaining({ id: "CONSTANT", type: "variable" }),
      ]),
    );
  });

  // Test caching
  test("should cache exported symbols", () => {
    const filePath = "project/module.py";
    const cacheKey = `${filePath}|symbols`;

    expect(resolver["cache"].has(cacheKey)).toBe(false);
    const symbolsFirstCall = resolver.getSymbols(filePath);
    expect(resolver["cache"].has(cacheKey)).toBe(true);

    const symbolsSecondCall = resolver.getSymbols(filePath);
    expect(symbolsSecondCall).toBe(symbolsFirstCall);
  });

  // Test empty files
  test("should return an empty array for files with no symbols", () => {
    const symbols = resolver.getSymbols("project/empty.py");
    expect(symbols).toEqual([]);
  });

  // Test __all__ behavior: __all__ should not be exported as a variable.
  test("should ignore __all__ as a variable export", () => {
    const symbols = resolver.getSymbols("project/module_with_all.py");

    // Should detect the actual symbols from the file.
    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "ExportedClass", type: "class" }),
        expect.objectContaining({ id: "exported_function", type: "function" }),
        expect.objectContaining({ id: "some_variable", type: "variable" }),
      ]),
    );

    // __all__ itself should not appear.
    expect(symbols.some((symbol) => symbol.id === "__all__")).toBe(false);
  });

  // Test that supportsWildcardImport is set correctly when __all__ is defined.
  test("should set supportsWildcardImport based on __all__ when defined", () => {
    const symbols = resolver.getSymbols("project/module_with_all.py");
    const exportedClass = symbols.find((sym) => sym.id === "ExportedClass");
    const exportedFunction = symbols.find(
      (sym) => sym.id === "exported_function",
    );
    const someVariable = symbols.find((sym) => sym.id === "some_variable");

    expect(exportedClass).toBeDefined();
    expect(exportedFunction).toBeDefined();
    expect(someVariable).toBeDefined();

    // According to __all__, only "ExportedClass" and "exported_function" should support wildcard import.
    expect(exportedClass?.supportsWildcardImport).toBe(true);
    expect(exportedFunction?.supportsWildcardImport).toBe(true);
    expect(someVariable?.supportsWildcardImport).toBe(false);
  });

  // Test that supportsWildcardImport is true for all symbols if __all__ is not defined.
  test("should set supportsWildcardImport to true when __all__ is not defined", () => {
    const symbols = resolver.getSymbols("project/module.py");
    symbols.forEach((sym) => {
      expect(sym.supportsWildcardImport).toBe(true);
    });
  });
});
