import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonUsageResolver } from ".";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModule } from "../moduleResolver/types";
import { InternalUsage } from "./types";
import { PythonSymbol } from "../exportExtractor/types";

describe("UsageResolver", () => {
  let parser: Parser;
  let exportExtractor: PythonExportExtractor;
  let resolver: PythonUsageResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    parser = pythonParser;

    // Create test files
    files = new Map([
      // Basic module with symbols
      [
        "module_a.py",
        {
          path: "module_a.py",
          rootNode: parser.parse(`
def function_a():
    return "Hello from function A"

def function_b():
    return "Hello from function B"

CONSTANT_A = 42
          `).rootNode,
        },
      ],
      // Module that imports and partially uses symbols
      [
        "module_b.py",
        {
          path: "module_b.py",
          rootNode: parser.parse(`
from module_a import function_a, function_b as renamed_b, CONSTANT_A
import external_module

def use_imports():
    result = function_a()
    another = renamed_b()
    external_module.do_something()
    return result
          `).rootNode,
        },
      ],
      // Module that imports symbols with ambiguous aliasing
      [
        "module_c.py",
        {
          path: "module_c.py",
          rootNode: parser.parse(`
from module_a import function_a as function_b, function_b as function_a

def use_ambiguous_imports():
    result_a = function_a()
    result_b = function_b()
    return result_a, result_b
          `).rootNode,
        },
      ],
      // Module with direct module references
      [
        "module_with_submodules.py",
        {
          path: "module_with_submodules.py",
          rootNode: parser.parse(`
import module_a

def use_module():
    # Direct module reference
    module_a.function_a()
    module_a.function_b()
        `).rootNode,
        },
      ],
      // Package root
      [
        "package/__init__.py",
        {
          path: "package/__init__.py",
          rootNode: parser.parse(`
from .submod import submod_func

def init_func():
    return "Init function"
        `).rootNode,
        },
      ],
      // Package submodule
      [
        "package/submod.py",
        {
          path: "package/submod.py",
          rootNode: parser.parse(`
def submod_func():
    return "Submodule function"
        `).rootNode,
        },
      ],
      // Module using a package
      [
        "use_package.py",
        {
          path: "use_package.py",
          rootNode: parser.parse(`
import package
from package import submod

def use_package_func():
    # Use the package directly
    package.init_func()
    # Use a submodule
    package.submod.submod_func()
    # Use imported submodule
    submod.submod_func()
        `).rootNode,
        },
      ],
      // Nested package root
      [
        "nested_pkg/__init__.py",
        {
          path: "nested_pkg/__init__.py",
          rootNode: parser.parse(`
from .sub1 import sub1_func
        `).rootNode,
        },
      ],
      // Nested package submodule
      [
        "nested_pkg/sub1/__init__.py",
        {
          path: "nested_pkg/sub1/__init__.py",
          rootNode: parser.parse(`
from .subsubmod import subsub_func

def sub1_func():
    return "Sub1 function"
        `).rootNode,
        },
      ],
      // Nested package sub-submodule
      [
        "nested_pkg/sub1/subsubmod.py",
        {
          path: "nested_pkg/sub1/subsubmod.py",
          rootNode: parser.parse(`
def subsub_func():
    return "Deep nested function"
        `).rootNode,
        },
      ],
      // Module using nested package
      [
        "use_nested_pkg.py",
        {
          path: "use_nested_pkg.py",
          rootNode: parser.parse(`
import nested_pkg

def use_nested_function():
    # Use deeply nested module
    result = nested_pkg.sub1.subsub_func()
    return result
        `).rootNode,
        },
      ],
      // Module with unused imports
      [
        "unused_module_import.py",
        {
          path: "unused_module_import.py",
          rootNode: parser.parse(`
import module_a

def no_usage():
    # No module usage
    return "No module usage"
        `).rootNode,
        },
      ],
      // Re-export test modules
      [
        "original.py",
        {
          path: "original.py",
          rootNode: parser.parse(`
def original_func():
    return "Original function"
          `).rootNode,
        },
      ],
      [
        "reexporter.py",
        {
          path: "reexporter.py",
          rootNode: parser.parse(`
from original import original_func
          `).rootNode,
        },
      ],
      [
        "consumer.py",
        {
          path: "consumer.py",
          rootNode: parser.parse(`
from reexporter import original_func

def consumer_func():
    return original_func()
          `).rootNode,
        },
      ],
    ]);

    exportExtractor = new PythonExportExtractor(parser, files);
    resolver = new PythonUsageResolver(parser, exportExtractor);
  });

  describe("resolveInternalUsageForSymbol", () => {
    test("should resolve internal symbol usage", () => {
      const targetFile = files.get("module_b.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };
      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );
      const exportExtractor = new PythonExportExtractor(parser, files);
      const { symbols } = exportExtractor.getSymbols("module_a.py");
      const moduleResolver = new PythonModuleResolver(files, "3.10");

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      const symbol = symbols.find(
        (s) => s.identifierNode.text === "function_a",
      ) as PythonSymbol;

      // Check for usage of module_a in module_b
      resolver.resolveInternalUsageForSymbol(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        symbol,
        symbol.identifierNode.text,
        internalUsageMap,
      );

      // Verify results
      expect(internalUsageMap.size).toBe(1);
      expect(internalUsageMap.has(moduleA.path)).toBeTruthy();
      expect(internalUsageMap.get(moduleA.path)?.symbols.size).toBe(1);
      expect(internalUsageMap.get(moduleA.path)?.symbols.get(symbol.id)).toBe(
        symbol,
      );
    });

    test("should resolve internal symbol usage with alias", () => {
      const targetFile = files.get("module_b.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };
      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );
      const exportExtractor = new PythonExportExtractor(parser, files);
      const { symbols } = exportExtractor.getSymbols("module_a.py");
      const moduleResolver = new PythonModuleResolver(files, "3.10");

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      const symbol = symbols.find(
        (s) => s.identifierNode.text === "function_b",
      ) as PythonSymbol;

      // Check for usage of module_a in module_b
      resolver.resolveInternalUsageForSymbol(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        symbol,
        "renamed_b",
        internalUsageMap,
      );

      // Verify results
      expect(internalUsageMap.size).toBe(1);
      expect(internalUsageMap.has(moduleA.path)).toBeTruthy();
      expect(internalUsageMap.get(moduleA.path)?.symbols.size).toBe(1);
      expect(internalUsageMap.get(moduleA.path)?.symbols.get(symbol.id)).toBe(
        symbol,
      );
    });

    test("should not resolve internal symbol usage if unused (only within node to exclude)", () => {
      const targetFile = files.get("module_b.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };
      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );
      const exportExtractor = new PythonExportExtractor(parser, files);
      const { symbols } = exportExtractor.getSymbols("module_a.py");
      const moduleResolver = new PythonModuleResolver(files, "3.10");

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      const symbol = symbols.find(
        (s) => s.identifierNode.text === "CONSTANT_A",
      ) as PythonSymbol;

      // Check for usage of module_a in module_b
      resolver.resolveInternalUsageForSymbol(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        symbol,
        "CONSTANT_A",
        internalUsageMap,
      );

      // Verify results
      expect(internalUsageMap.size).toBe(0);
    });

    test("should resolve internal symbol usage with ambiguous alias", () => {
      const targetFile = files.get("module_c.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };
      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );
      const exportExtractor = new PythonExportExtractor(parser, files);
      const { symbols } = exportExtractor.getSymbols("module_a.py");
      const moduleResolver = new PythonModuleResolver(files, "3.10");

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      const symbolFunctionA = symbols.find(
        (s) => s.identifierNode.text === "function_a",
      ) as PythonSymbol;
      const symbolFunctionB = symbols.find(
        (s) => s.identifierNode.text === "function_b",
      ) as PythonSymbol;

      // Check for usage of function_a in module_c
      resolver.resolveInternalUsageForSymbol(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        symbolFunctionA,
        "function_b", // alias for function_a
        internalUsageMap,
      );

      expect(internalUsageMap.size).toBe(1);
      expect(internalUsageMap.has(moduleA.path)).toBeTruthy();
      expect(internalUsageMap.get(moduleA.path)?.symbols.size).toBe(1);
      expect(
        internalUsageMap.get(moduleA.path)?.symbols.get(symbolFunctionA.id),
      ).toBe(symbolFunctionA);

      internalUsageMap.clear();

      // Check for usage of function_b in module_c
      resolver.resolveInternalUsageForSymbol(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        symbolFunctionB,
        "function_a", // alias for function_b
        internalUsageMap,
      );
      expect(internalUsageMap.size).toBe(1);
      expect(internalUsageMap.has(moduleA.path)).toBeTruthy();
      expect(internalUsageMap.get(moduleA.path)?.symbols.size).toBe(1);
      expect(
        internalUsageMap.get(moduleA.path)?.symbols.get(symbolFunctionB.id),
      ).toBe(symbolFunctionB);
    });
  });

  describe("resolveInternalUsageForModule", () => {
    let moduleResolver: PythonModuleResolver;

    beforeEach(() => {
      moduleResolver = new PythonModuleResolver(files, "3.10");
    });

    test("should resolve usage of module and its symbols", () => {
      const targetFile = files.get("module_with_submodules.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };

      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      // Check for usage of module_a and its symbols
      resolver.resolveInternalUsageForModule(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        "module_a",
        internalUsageMap,
      );

      // Verify results
      expect(internalUsageMap.size).toBe(1);
      expect(internalUsageMap.has(moduleA.path)).toBeTruthy();

      // Get the symbols from module_a to verify
      const exportResult = exportExtractor.getSymbols("module_a.py");
      const functionA = exportResult.symbols.find(
        (s) => s.identifierNode.text === "function_a",
      ) as PythonSymbol;
      const functionB = exportResult.symbols.find(
        (s) => s.identifierNode.text === "function_b",
      ) as PythonSymbol;

      // Should have found both function_a and function_b
      expect(internalUsageMap.get(moduleA.path)?.symbols.size).toBe(2);
      expect(
        internalUsageMap.get(moduleA.path)?.symbols.get(functionA.id),
      ).toBe(functionA);
      expect(
        internalUsageMap.get(moduleA.path)?.symbols.get(functionB.id),
      ).toBe(functionB);
    });

    test("should resolve usage of package and its submodules", () => {
      const targetFile = files.get("use_package.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };

      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );

      const packageModule = moduleResolver.getModuleFromFilePath(
        "package/__init__.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      // Check for usage of package and its submodules
      resolver.resolveInternalUsageForModule(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        packageModule,
        "package",
        internalUsageMap,
      );

      // Verify results
      expect(internalUsageMap.size).toBeGreaterThan(0);
      expect(internalUsageMap.has(packageModule.path)).toBeTruthy();

      // Get the init module function
      const initExportResult = exportExtractor.getSymbols(
        "package/__init__.py",
      );
      const initFunc = initExportResult.symbols.find(
        (s) => s.identifierNode.text === "init_func",
      ) as PythonSymbol;

      // Check that the init_func is found
      expect(
        internalUsageMap.get(packageModule.path)?.symbols.get(initFunc.id),
      ).toBe(initFunc);

      // Since submod is a submodule of package, we need to find it in the children
      const submodPath = "package/submod.py";
      const hasSubmod = Array.from(internalUsageMap.keys()).some(
        (key) => key === submodPath,
      );
      expect(hasSubmod).toBeTruthy();

      // Get the submodule function
      const submodExportResult =
        exportExtractor.getSymbols("package/submod.py");
      const submodFunc = submodExportResult.symbols.find(
        (s) => s.identifierNode.text === "submod_func",
      ) as PythonSymbol;

      // Check that the submod_func is found
      expect(internalUsageMap.get(submodPath)?.symbols.get(submodFunc.id)).toBe(
        submodFunc,
      );
    });

    test("should not detect usage of module that isn't used", () => {
      const targetFile = files.get("unused_module_import.py") as {
        path: string;
        rootNode: Parser.SyntaxNode;
      };

      const importExtractor = new PythonImportExtractor(parser, files);
      const importStatements = importExtractor.getImportStatements(
        targetFile.path,
      );

      const moduleA = moduleResolver.getModuleFromFilePath(
        "module_a.py",
      ) as PythonModule;

      // Setup a map to collect results
      const internalUsageMap = new Map<string, InternalUsage>();

      // Check for usage of module_a (which isn't actually used)
      resolver.resolveInternalUsageForModule(
        targetFile.rootNode,
        importStatements.map((i) => i.node),
        moduleA,
        "module_a",
        internalUsageMap,
      );

      // Verify the module is tracked but no symbols are used
      expect(internalUsageMap.size).toBe(0);
    });
  });

  test("should track re-exporting modules", () => {
    const targetFile = files.get("consumer.py") as {
      path: string;
      rootNode: Parser.SyntaxNode;
    };
    const importExtractor = new PythonImportExtractor(parser, files);
    const importStatements = importExtractor.getImportStatements(
      targetFile.path,
    );
    const exportExtractor = new PythonExportExtractor(parser, files);
    const { symbols: originalSymbols } =
      exportExtractor.getSymbols("original.py");
    const moduleResolver = new PythonModuleResolver(files, "3.10");

    const originalModule = moduleResolver.getModuleFromFilePath(
      "original.py",
    ) as PythonModule;
    const reexporterModule = moduleResolver.getModuleFromFilePath(
      "reexporter.py",
    ) as PythonModule;

    // Setup a map to collect results
    const internalUsageMap = new Map<string, InternalUsage>();

    const symbol = originalSymbols.find(
      (s) => s.identifierNode.text === "original_func",
    ) as PythonSymbol;

    // Check for usage of original.py in consumer.py with reexporter.py as the re-exporting module
    resolver.resolveInternalUsageForSymbol(
      targetFile.rootNode,
      importStatements.map((i) => i.node),
      originalModule,
      symbol,
      symbol.identifierNode.text,
      internalUsageMap,
      reexporterModule,
    );

    // Verify results
    expect(internalUsageMap.size).toBe(1);
    expect(internalUsageMap.has(originalModule.path)).toBeTruthy();

    // Check symbol tracking
    const usage = internalUsageMap.get(originalModule.path);
    expect(usage?.symbols.size).toBe(1);
    expect(usage?.symbols.get(symbol.id)).toBe(symbol);

    // Check re-exporting module tracking
    expect(usage?.reExportingModules).toBeDefined();
    expect(usage?.reExportingModules?.size).toBe(1);
    expect(usage?.reExportingModules?.has(reexporterModule.path)).toBeTruthy();
    expect(usage?.reExportingModules?.get(reexporterModule.path)).toBe(
      reexporterModule,
    );
  });
});
