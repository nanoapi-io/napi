import { describe, expect, test } from "vitest";
import Parser from "tree-sitter";
import {
  PythonExportExtractor,
  PYTHON_CLASS_TYPE,
  PYTHON_FUNCTION_TYPE,
  PYTHON_VARIABLE_TYPE,
} from "./index";
import { pythonParser } from "../../../helpers/treeSitter/parsers";

describe("PythonExportExtractor", () => {
  const parser = pythonParser;

  test("should extract simple class definitions", () => {
    const code = `
    class MyClass:
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("class_test.py", {
      path: "class_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("class_test.py");
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );

    expect(classSymbols.length).toBeGreaterThanOrEqual(1);
    const myClass = classSymbols.find((s) => s.id === "MyClass");
    expect(myClass).toBeDefined();
    // Optionally, check that the syntax node's text matches expectations.
    expect(myClass?.identifierNode.text).toBe("MyClass");
  });

  test("should extract decorated class definitions", () => {
    const code = `
    @decorator
    class DecoratedClass:
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("decorated_class_test.py", {
      path: "decorated_class_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("decorated_class_test.py");
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );

    expect(classSymbols.length).toBeGreaterThanOrEqual(1);
    const decClass = classSymbols.find((s) => s.id === "DecoratedClass");
    expect(decClass).toBeDefined();
  });

  test("should extract simple function definitions", () => {
    const code = `
    def my_function():
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("function_test.py", {
      path: "function_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("function_test.py");
    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );

    expect(functionSymbols.length).toBeGreaterThanOrEqual(1);
    const func = functionSymbols.find((s) => s.id === "my_function");
    expect(func).toBeDefined();
  });

  test("should extract decorated function definitions", () => {
    const code = `
    @decorator
    def decorated_function():
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("decorated_function_test.py", {
      path: "decorated_function_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("decorated_function_test.py");
    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );

    expect(functionSymbols.length).toBeGreaterThanOrEqual(1);
    const decFunc = functionSymbols.find((s) => s.id === "decorated_function");
    expect(decFunc).toBeDefined();
  });

  test("should extract variable assignments and not include __all__", () => {
    const code = `
    x = 10
    y, z = 20, 30
    __all__ = ["x", "y", "z"]
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("variable_test.py", {
      path: "variable_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("variable_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // Expect that x, y, z are extracted as variables.
    const varX = variableSymbols.find((s) => s.id === "x");
    const varY = variableSymbols.find((s) => s.id === "y");
    const varZ = variableSymbols.find((s) => s.id === "z");
    expect(varX).toBeDefined();
    expect(varY).toBeDefined();
    expect(varZ).toBeDefined();

    // __all__ should not be among exported symbols.
    const exportedIds = result.symbols.map((s) => s.id);
    expect(exportedIds).not.toContain("__all__");
  });

  test("should extract __all__ elements correctly", () => {
    const code = `
    __all__ = ["a", "b", "c"]
    a = 1
    b = 2
    c = 3
    d = 4
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("all_test.py", { path: "all_test.py", rootNode: tree.rootNode });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("all_test.py");

    // publicSymbols should reflect the __all__ definition.
    expect(result.publicSymbols).toContain("a");
    expect(result.publicSymbols).toContain("b");
    expect(result.publicSymbols).toContain("c");
    // 'd' is not public because it's not in __all__
    expect(result.publicSymbols).not.toContain("d");
  });
});
