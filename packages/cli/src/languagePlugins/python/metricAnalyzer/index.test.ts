import { describe, expect, test } from "vitest";
import Parser from "tree-sitter";
import { PythonMetricsAnalyzer } from "./index.js";
import { PythonExportExtractor } from "../exportExtractor/index.js";
import { pythonParser } from "../../../helpers/treeSitter/parsers.js";

describe("PythonMetricsAnalyzer", () => {
  const parser = pythonParser;

  // Helper function to set up the test environment
  function setupTest(code: string, filename = "test.py") {
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set(filename, {
      path: filename,
      rootNode: tree.rootNode,
    });

    const exportExtractor = new PythonExportExtractor(parser, files);
    const complexityAnalyzer = new PythonMetricsAnalyzer(parser);

    return { exportExtractor, complexityAnalyzer, filename, tree };
  }

  test("should analyze a simple function", () => {
    const code = `
def simple_function():
    return 42
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    expect(symbols.length).toBeGreaterThan(0);

    const functionSymbol = symbols.find((s) => s.id === "simple_function");
    expect(functionSymbol).toBeDefined();

    if (!functionSymbol) {
      throw new Error("Function symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = functionSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    expect(metrics.cyclomaticComplexity).toBe(1);
    expect(metrics.codeLinesCount).toBeGreaterThan(0);
    expect(metrics.linesCount).toBeGreaterThan(0);
    expect(metrics.characterCount).toBeGreaterThan(0);
    expect(metrics.codeCharacterCount).toBeGreaterThan(0);
  });

  test("should analyze a function with branches", () => {
    const code = `
def complex_function(a, b):
    if a > 0:
        if b > 0:
            return a + b
        else:
            return a - b
    elif a < 0:
        return -a + b
    else:
        for i in range(10):
            if i % 2 == 0:
                continue
            elif i % 3 == 0:
                break
        return 0
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    const functionSymbol = symbols.find((s) => s.id === "complex_function");
    expect(functionSymbol).toBeDefined();

    if (!functionSymbol) {
      throw new Error("Function symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = functionSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Base complexity 1 + branches:
    // 1(if a>0) + 1(if b>0) + 1(else for b) + 1(elif a<0) + 1(else for a) +
    // 1(for loop) + 1(if i%2) + 1(elif i%3)
    // = 1 + 8 = 9
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(1);
  });

  test("should analyze a function with logical operators", () => {
    const code = `
def logical_function(a, b, c):
    if a > 0 and b > 0:
        return True
    elif a < 0 or b < 0:
        if c and (a or b):
            return False
    return None
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    const functionSymbol = symbols.find((s) => s.id === "logical_function");
    expect(functionSymbol).toBeDefined();

    if (!functionSymbol) {
      throw new Error("Function symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = functionSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Base complexity 1 + branches:
    // 1(if) + 1(and) + 1(elif) + 1(or) + 1(if c) + 1(and) + 1(or)
    // = 1 + 7 = 8
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(4);
  });

  test("should analyze a class with methods", () => {
    const code = `
class TestClass:
    def __init__(self, value):
        self.value = value
        
    def simple_method(self):
        return self.value
        
    def complex_method(self, factor):
        if factor > 0:
            return self.value * factor
        else:
            return self.value
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    const classSymbol = symbols.find((s) => s.id === "TestClass");
    expect(classSymbol).toBeDefined();

    if (!classSymbol) {
      throw new Error("Class symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = classSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Should have found the if-else in the complex_method
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(1);
  });

  test("should handle comments and empty lines correctly", () => {
    const code = `
def commented_function():
    # This is a comment
    
    # Another comment
    value = 42  # Inline comment
    
    # Final comment
    return value
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    const functionSymbol = symbols.find((s) => s.id === "commented_function");
    expect(functionSymbol).toBeDefined();

    if (!functionSymbol) {
      throw new Error("Function symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = functionSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Only actual code lines should be counted
    expect(metrics.linesCount).toBeGreaterThan(metrics.codeLinesCount);
    expect(metrics.codeLinesCount).toBeGreaterThan(0);
    expect(metrics.characterCount).toBeGreaterThan(metrics.codeCharacterCount);
    expect(metrics.codeCharacterCount).toBeGreaterThan(0);
  });

  test("should analyze try/except blocks", () => {
    const code = `
def exception_function():
    try:
        value = 42
        return value
    except ValueError:
        return "Value error"
    except TypeError:
        return "Type error"
    finally:
        print("Cleanup")
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    const functionSymbol = symbols.find((s) => s.id === "exception_function");
    expect(functionSymbol).toBeDefined();

    if (!functionSymbol) {
      throw new Error("Function symbol not found");
    }

    // Use the nodes property (not node)
    const nodes = functionSymbol.nodes;
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Should have complexity from try and except blocks
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(2);
  });

  test("should analyze an entire file", () => {
    const code = `
def function1():
    return 1

def function2(x):
    if x > 0:
        return x
    return 0

class TestClass:
    def method1(self):
        try:
            return 42
        except:
            return 0
`;

    const { complexityAnalyzer, tree } = setupTest(code);

    // Analyze the entire file using the root node
    const nodes = [tree.rootNode];
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Should include complexity from all functions and methods
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(3);
    expect(metrics.linesCount).toBeGreaterThan(0);
    expect(metrics.codeLinesCount).toBeGreaterThan(0);
    expect(metrics.characterCount).toBeGreaterThan(0);
    expect(metrics.codeCharacterCount).toBeGreaterThan(0);
  });

  test("should analyze multiple nodes", () => {
    const code = `
def function1():
    return 1

def function2(x):
    if x > 0:
        return x
    return 0
`;

    const { exportExtractor, complexityAnalyzer, filename } = setupTest(code);
    const { symbols } = exportExtractor.getSymbols(filename);

    // Get both function nodes
    const function1Symbol = symbols.find((s) => s.id === "function1");
    const function2Symbol = symbols.find((s) => s.id === "function2");

    expect(function1Symbol).toBeDefined();
    expect(function2Symbol).toBeDefined();

    if (!function1Symbol || !function2Symbol) {
      throw new Error("Function symbols not found");
    }

    // Use the nodes property (not node)
    const nodes = [...function1Symbol.nodes, ...function2Symbol.nodes];
    const metrics = complexityAnalyzer.analyzeNodes(nodes);

    // Should include complexity from both functions
    expect(metrics.cyclomaticComplexity).toBeGreaterThan(1);

    // Compare with analyzing them separately
    const metrics1 = complexityAnalyzer.analyzeNodes(function1Symbol.nodes);
    const metrics2 = complexityAnalyzer.analyzeNodes(function2Symbol.nodes);

    // Total metrics should be sum of individual metrics (except base complexity is counted once)
    expect(metrics.codeLinesCount).toBe(
      metrics1.codeLinesCount + metrics2.codeLinesCount,
    );
    expect(metrics.linesCount).toBe(metrics1.linesCount + metrics2.linesCount);
    expect(metrics.characterCount).toBe(
      metrics1.characterCount + metrics2.characterCount,
    );
    expect(metrics.codeCharacterCount).toBe(
      metrics1.codeCharacterCount + metrics2.codeCharacterCount,
    );
  });
});
