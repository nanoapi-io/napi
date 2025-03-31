import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonUsageResolver } from "../usageResolver";
import { PythonDependencyResolver } from "./index";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";

describe("PythonDependencyResolver", () => {
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let moduleResolver: PythonModuleResolver;
  let itemResolver: PythonItemResolver;
  let usageResolver: PythonUsageResolver;
  let resolver: PythonDependencyResolver;

  beforeEach(() => {
    // Setup test files
    files = new Map([
      [
        "main.py",
        {
          path: "main.py",
          rootNode: pythonParser.parse(`
import external_lib
from utils import helper_func

def main():
    result = helper_func()
    external_lib.do_something()
    return result
          `).rootNode,
        },
      ],
      [
        "utils.py",
        {
          path: "utils.py",
          rootNode: pythonParser.parse(`
def helper_func():
    return "Hello from helper"

def unused_func():
    return "I'm not used"
          `).rootNode,
        },
      ],
      [
        "empty.py",
        {
          path: "empty.py",
          rootNode: pythonParser.parse(``).rootNode,
        },
      ],
      [
        "multi_function.py",
        {
          path: "multi_function.py",
          rootNode: pythonParser.parse(`
from utils import helper_func, unused_func
import external_lib

def func_a():
    helper_func()
    
def func_b():
    external_lib.do_something()
    
def func_c():
    pass
          `).rootNode,
        },
      ],
    ]);

    // Initialize dependencies
    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleResolver = new PythonModuleResolver(files);
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

    // Create the resolver
    resolver = new PythonDependencyResolver(
      files,
      exportExtractor,
      usageResolver,
    );
  });

  test("resolves file-level dependencies correctly", () => {
    const dependencies = resolver.getFileDependencies("main.py");

    // Check basic properties
    expect(dependencies.filePath).toBe("main.py");
    expect(dependencies.dependencies.size).toBe(2);

    // Check for utils.py internal dependency
    const internalDep = dependencies.dependencies.get("utils.py");
    expect(internalDep).toBeDefined();
    expect(internalDep?.isExternal).toBe(false);
    expect(internalDep?.symbols.has("helper_func")).toBe(true);

    // Check for external_lib external dependency
    const externalDep = dependencies.dependencies.get("external_lib");
    expect(externalDep).toBeDefined();
    expect(externalDep?.isExternal).toBe(true);
  });

  test("resolves symbol-level dependencies correctly", () => {
    const dependencies = resolver.getFileDependencies("multi_function.py");

    // Check that we have three symbols (three functions)
    expect(dependencies.symbols.length).toBe(3);

    // Find the symbols by ID
    const funcA = dependencies.symbols.find((s) => s.id === "func_a");
    const funcB = dependencies.symbols.find((s) => s.id === "func_b");
    const funcC = dependencies.symbols.find((s) => s.id === "func_c");

    // Check func_a dependencies
    expect(funcA).toBeDefined();
    const funcAUtils = funcA?.dependencies.get("utils.py");
    expect(funcAUtils).toBeDefined();
    expect(funcAUtils?.symbols.has("helper_func")).toBe(true);

    // Check func_b dependencies
    expect(funcB).toBeDefined();
    const funcBExternal = funcB?.dependencies.get("external_lib");
    expect(funcBExternal).toBeDefined();
    expect(funcBExternal?.isExternal).toBe(true);

    // Check func_c has no dependencies
    expect(funcC).toBeDefined();
    expect(funcC?.dependencies.size).toBe(0);
  });

  test("returns empty dependencies for files with no imports", () => {
    const dependencies = resolver.getFileDependencies("empty.py");

    expect(dependencies.dependencies.size).toBe(0);
    expect(dependencies.symbols.length).toBe(0);
  });

  test("throws error for non-existent file", () => {
    expect(() => resolver.getFileDependencies("nonexistent.py")).toThrow(
      "File not found",
    );
  });

  test("caches results for better performance", () => {
    // First call - should compute dependencies
    const firstCall = resolver.getFileDependencies("main.py");

    // Second call - should return cached result (same object instance)
    const secondCall = resolver.getFileDependencies("main.py");

    // If cached properly, the objects should be identical (same reference)
    expect(secondCall).toBe(firstCall);
  });
});
