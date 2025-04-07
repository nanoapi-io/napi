import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";
import { PythonUsageResolver } from "../usageResolver";
import {
  FileDependencies,
  PythonDependencyResolver,
} from "../dependencyResolver";
import { PythonSymbolExtractor } from "./index";

describe("PythonSymbolExtractor", () => {
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let moduleResolver: PythonModuleResolver;
  let itemResolver: PythonItemResolver;
  let usageResolver: PythonUsageResolver;
  let dependencyResolver: PythonDependencyResolver;
  let dependencyMap: Map<string, FileDependencies>;
  let symbolExtractor: PythonSymbolExtractor;

  beforeEach(() => {
    // Setup test files with various dependencies
    files = new Map([
      // Basic module with symbols
      [
        "module_a.py",
        {
          path: "module_a.py",
          rootNode: pythonParser.parse(
            `
def function_a():
    return "Hello from A"
    
def function_b():
    return "Another function"

def helper_function():
    return "Helper"
`.trim(),
          ).rootNode,
        },
      ],
      // Module that depends on module_a
      [
        "module_b.py",
        {
          path: "module_b.py",
          rootNode: pythonParser.parse(
            `
from module_a import function_a, helper_function

def function_c():
    return function_a() + " via C"

def another_function():
    return helper_function() + " from B"
`.trim(),
          ).rootNode,
        },
      ],
      // Module with nested dependencies
      [
        "module_c.py",
        {
          path: "module_c.py",
          rootNode: pythonParser.parse(
            `
from module_b import function_c

def function_d():
    return function_c() + " and D"
`.trim(),
          ).rootNode,
        },
      ],
      // Package with __init__.py
      [
        "package/__init__.py",
        {
          path: "package/__init__.py",
          rootNode: pythonParser.parse(
            `
from .submodule import pkg_function

def init_function():
    return "From init"
`.trim(),
          ).rootNode,
        },
      ],
      // Submodule in the package
      [
        "package/submodule.py",
        {
          path: "package/submodule.py",
          rootNode: pythonParser.parse(
            `
def pkg_function():
    return "From package"

def internal_helper():
    return "Internal helper"
`.trim(),
          ).rootNode,
        },
      ],
      // Module using the package
      [
        "use_package.py",
        {
          path: "use_package.py",
          rootNode: pythonParser.parse(
            `
from package import pkg_function, init_function

def use_pkg():
    return pkg_function() + init_function()

def standalone_function():
    return "I don't depend on anything"
`.trim(),
          ).rootNode,
        },
      ],
      // Circular dependency 1
      [
        "circular1.py",
        {
          path: "circular1.py",
          rootNode: pythonParser.parse(
            `
from circular2 import circ_func2

def circ_func1():
    return circ_func2() + " circular1"
`.trim(),
          ).rootNode,
        },
      ],
      // Circular dependency 2
      [
        "circular2.py",
        {
          path: "circular2.py",
          rootNode: pythonParser.parse(
            `
from circular1 import circ_func1

def circ_func2():
    return circ_func1() + " circular2"
`.trim(),
          ).rootNode,
        },
      ],
      // Complex module with class and multiple dependencies
      [
        "complex_module.py",
        {
          path: "complex_module.py",
          rootNode: pythonParser.parse(
            `
from module_a import function_a
from module_b import another_function
from package import pkg_function

class ComplexClass:
    def __init__(self):
        self.a = function_a()
        self.b = another_function()
    
    def method(self):
        return pkg_function() + self.a + self.b

def complex_function():
    return ComplexClass().method()
`.trim(),
          ).rootNode,
        },
      ],
      // Module with multiple disjoint functions
      [
        "multifunction.py",
        {
          path: "multifunction.py",
          rootNode: pythonParser.parse(
            `
from module_a import function_a
from package.submodule import internal_helper

def first_function():
    return function_a() + " in first"

def second_function():
    return internal_helper() + " in second"

def independent_function():
    return "I'm independent"
`.trim(),
          ).rootNode,
        },
      ],
    ]);

    // Initialize all required components
    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleResolver = new PythonModuleResolver(files, "3.13");
    itemResolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleResolver,
    );
    usageResolver = new PythonUsageResolver(
      pythonParser,
      importExtractor,
      moduleResolver,
      itemResolver,
    );
    dependencyResolver = new PythonDependencyResolver(
      files,
      exportExtractor,
      usageResolver,
    );

    // Build the dependency map
    dependencyMap = new Map();
    files.forEach((_, path) => {
      try {
        dependencyMap.set(path, dependencyResolver.getFileDependencies(path));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Ignore errors for invalid files
      }
    });

    // Initialize the symbol extractor
    symbolExtractor = new PythonSymbolExtractor(
      files,
      exportExtractor,
      moduleResolver,
      dependencyMap,
      pythonParser,
    );
  });

  test("Should extract a single symbol from a module", () => {
    const symbols = [
      {
        name: "function_a",
        type: "function",
        filePath: "module_a.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    expect(result.size).toBe(1);
    expect(result.get("module_a.py")?.rootNode.text.trim()).toBe(
      `
def function_a():
    return "Hello from A"
`.trim(),
    );
  });

  test("Should extract a symbol with its dependencies", () => {
    const symbols = [
      {
        name: "function_c",
        type: "function",
        filePath: "module_b.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should include module_b.py with function_c
    expect(result.has("module_b.py")).toBe(true);
    expect(result.get("module_b.py")?.rootNode.text).toContain("function_c");
    expect(result.get("module_b.py")?.rootNode.text).not.toContain(
      "another_function",
    );

    // Should include module_a.py with function_a (dependency)
    expect(result.has("module_a.py")).toBe(true);
    expect(result.get("module_a.py")?.rootNode.text).toContain("function_a");
    expect(result.get("module_a.py")?.rootNode.text).not.toContain(
      "function_b",
    );
  });

  test("Should extract a symbol with transitive dependencies", () => {
    const symbols = [
      {
        name: "function_d",
        type: "function",
        filePath: "module_c.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should have all three modules in the dependency chain
    expect(result.size).toBeGreaterThanOrEqual(3);
    expect(result.has("module_c.py")).toBe(true);
    expect(result.has("module_b.py")).toBe(true);
    expect(result.has("module_a.py")).toBe(true);

    // Check that only required functions are included
    expect(result.get("module_c.py")?.rootNode.text).toContain("function_d");
    expect(result.get("module_b.py")?.rootNode.text).toContain("function_c");
    expect(result.get("module_a.py")?.rootNode.text).toContain("function_a");
    expect(result.get("module_a.py")?.rootNode.text).not.toContain(
      "function_b",
    );
  });

  test("Should extract a symbol from a package", () => {
    const symbols = [
      {
        name: "use_pkg",
        type: "function",
        filePath: "use_package.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should include the package files
    expect(result.has("use_package.py")).toBe(true);
    expect(result.has("package/__init__.py")).toBe(true);
    expect(result.has("package/submodule.py")).toBe(true);

    // The standalone function should not be included
    const usePkgFile = result.get("use_package.py")?.rootNode.text;
    expect(usePkgFile).toContain("use_pkg");
    expect(usePkgFile).not.toContain("standalone_function");

    // The necessary package functions should be included
    expect(result.get("package/__init__.py")?.rootNode.text).toContain(
      "init_function",
    );
    expect(result.get("package/submodule.py")?.rootNode.text).toContain(
      "pkg_function",
    );
    expect(result.get("package/submodule.py")?.rootNode.text).not.toContain(
      "internal_helper",
    );
  });

  test("Should handle circular dependencies", () => {
    const symbols = [
      {
        name: "circ_func1",
        type: "function",
        filePath: "circular1.py",
      },
    ];

    // This test mainly checks that the extraction doesn't cause an infinite loop
    const result = symbolExtractor.extractSymbols(symbols);
    expect(result.has("circular1.py")).toBe(true);
    expect(result.has("circular2.py")).toBe(true);

    // Both files should have their functions preserved
    expect(result.get("circular1.py")?.rootNode.text).toContain("circ_func1");
    expect(result.get("circular2.py")?.rootNode.text).toContain("circ_func2");
  });

  test("Should extract class with multiple dependencies", () => {
    const symbols = [
      {
        name: "ComplexClass",
        type: "class",
        filePath: "complex_module.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should include all dependencies
    expect(result.has("complex_module.py")).toBe(true);
    expect(result.has("module_a.py")).toBe(true);
    expect(result.has("module_b.py")).toBe(true);
    expect(result.has("package/__init__.py")).toBe(true);
    expect(result.has("package/submodule.py")).toBe(true);

    // The complex function should not be included
    const complexModuleText = result.get("complex_module.py")?.rootNode.text;
    expect(complexModuleText).toContain("ComplexClass");
    expect(complexModuleText).not.toContain("complex_function");

    // Required functions should be included in their modules
    expect(result.get("module_a.py")?.rootNode.text).toContain("function_a");
    expect(result.get("module_b.py")?.rootNode.text).toContain(
      "another_function",
    );
  });

  test("Should extract multiple requested symbols", () => {
    const symbols = [
      {
        name: "first_function",
        type: "function",
        filePath: "multifunction.py",
      },
      {
        name: "standalone_function",
        type: "function",
        filePath: "use_package.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should include both requested files
    expect(result.has("multifunction.py")).toBe(true);
    expect(result.has("use_package.py")).toBe(true);

    // Only requested functions and dependencies should be included
    const multiFunctionText = result.get("multifunction.py")?.rootNode.text;
    expect(multiFunctionText).toContain("first_function");
    expect(multiFunctionText).not.toContain("second_function");
    expect(multiFunctionText).not.toContain("independent_function");

    const usePackageText = result.get("use_package.py")?.rootNode.text;
    expect(usePackageText).toContain("standalone_function");
    expect(usePackageText).not.toContain("use_pkg");

    // Should include module_a but not package.submodule
    expect(result.has("module_a.py")).toBe(true);
    expect(result.has("package/submodule.py")).toBe(false);
  });

  test("Should extract disjoint symbols from the same file", () => {
    const symbols = [
      {
        name: "first_function",
        type: "function",
        filePath: "multifunction.py",
      },
      {
        name: "second_function",
        type: "function",
        filePath: "multifunction.py",
      },
    ];

    const result = symbolExtractor.extractSymbols(symbols);

    // Should include all necessary dependencies
    expect(result.has("multifunction.py")).toBe(true);
    expect(result.has("module_a.py")).toBe(true);
    expect(result.has("package/submodule.py")).toBe(true);
    expect(result.has("package/__init__.py")).toBe(true);

    // Both requested functions should be included but not the independent one
    const multiFunctionText = result.get("multifunction.py")?.rootNode.text;
    expect(multiFunctionText).toContain("first_function");
    expect(multiFunctionText).toContain("second_function");
    expect(multiFunctionText).not.toContain("independent_function");
  });

  test("Should throw error when requesting non-existent symbol", () => {
    const symbols = [
      {
        name: "non_existent_function",
        type: "function",
        filePath: "module_a.py",
      },
    ];

    expect(() => {
      symbolExtractor.extractSymbols(symbols);
    }).toThrow("Symbol non_existent_function not found in file module_a.py");
  });

  test("Should throw error when requesting symbol from non-existent file", () => {
    const symbols = [
      {
        name: "some_function",
        type: "function",
        filePath: "non_existent_file.py",
      },
    ];

    expect(() => {
      symbolExtractor.extractSymbols(symbols);
    }).toThrow("File non_existent_file.py not found in files map");
  });
});
