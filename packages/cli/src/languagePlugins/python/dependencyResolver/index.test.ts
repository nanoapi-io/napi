import { beforeEach, describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type Parser from "npm:tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers.ts";
import { PythonExportExtractor } from "../exportExtractor/index.ts";
import { PythonModuleResolver } from "../moduleResolver/index.ts";
import { PythonUsageResolver } from "../usageResolver/index.ts";
import { PythonImportExtractor } from "../importExtractor/index.ts";
import { PythonItemResolver } from "../itemResolver/index.ts";
import { PythonDependencyResolver } from "../dependencyResolver/index.ts";
import type { FileDependencies } from "./types.ts";
import { PYTHON_VARIABLE_TYPE } from "../exportExtractor/types.ts";
import { PythonMetricsAnalyzer } from "../metricAnalyzer/index.ts";
describe("DependencyResolver", () => {
  let parser: Parser;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let usageResolver: PythonUsageResolver;
  let moduleResolver: PythonModuleResolver;
  let itemResolver: PythonItemResolver;
  let metricsAnalyzer: PythonMetricsAnalyzer;
  let dependencyResolver: PythonDependencyResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    parser = pythonParser;

    // Create test files
    files = new Map([
      // Original module with function
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
      // Re-exporter module
      [
        "reexporter.py",
        {
          path: "reexporter.py",
          rootNode: parser.parse(`
from original import original_func
          `).rootNode,
        },
      ],
      // Consumer module
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
      // Another module for testing
      [
        "another.py",
        {
          path: "another.py",
          rootNode: parser.parse(`
def another_func():
    return "Another function"
          `).rootNode,
        },
      ],
      // Direct consumer module that imports directly from original
      [
        "direct_consumer.py",
        {
          path: "direct_consumer.py",
          rootNode: parser.parse(`
from original import original_func

def direct_func():
    return original_func()
        `).rootNode,
        },
      ],
      // Files for multi-level re-export test
      [
        "level1.py",
        {
          path: "level1.py",
          rootNode: parser.parse(`
from original import original_func
        `).rootNode,
        },
      ],
      [
        "level2.py",
        {
          path: "level2.py",
          rootNode: parser.parse(`
from level1 import original_func
        `).rootNode,
        },
      ],
      [
        "level3_consumer.py",
        {
          path: "level3_consumer.py",
          rootNode: parser.parse(`
from level2 import original_func

def level3_func():
    return original_func()
        `).rootNode,
        },
      ],
      // Module with modified variables and different dependencies at each modification
      [
        "modified_variables.py",
        {
          path: "modified_variables.py",
          rootNode: parser.parse(`
from original import original_func

# Initial declaration with dependency on original_func
counter = original_func()

from another import another_func

# Modification with dependency on another_func
counter += len(another_func())

# Another modification with both dependencies
counter = counter + len(original_func()) + len(another_func())
          `).rootNode,
        },
      ],
      // Module with multiple function definitions
      [
        "multi_function.py",
        {
          path: "multi_function.py",
          rootNode: parser.parse(`
from original import original_func

# First definition with dependency on original
def multi_func():
    return original_func()
    
from another import another_func

# Second definition with dependency on another
def multi_func(param):
    return another_func() + param
          `).rootNode,
        },
      ],
      // Module with sequential variable dependencies
      [
        "sequential_vars.py",
        {
          path: "sequential_vars.py",
          rootNode: parser.parse(`
from original import original_func

# First variable depends on original_func
var1 = original_func()

# Second variable depends on var1
var2 = var1 + " modified"

from another import another_func

# Third variable depends on another_func and var2
var3 = another_func() + var2

# Modification of var1 now depends on another_func
var1 = another_func()
          `).rootNode,
        },
      ],
      // Module with complex list and dictionary variables
      [
        "complex_vars.py",
        {
          path: "complex_vars.py",
          rootNode: parser.parse(`
from original import original_func
from another import another_func

# List with dependency on original_func
my_list = [original_func()]

# Augmented assignment with dependency on another_func
my_list += [another_func()]

# Dictionary with dependencies on both functions
my_dict = {
    "original": original_func(),
    "another": another_func()
}

# Dictionary modification
my_dict["third"] = original_func() + another_func()

# List reassignment with both dependencies
my_list = [original_func(), another_func()]
          `).rootNode,
        },
      ],
    ]);

    exportExtractor = new PythonExportExtractor(parser, files);
    importExtractor = new PythonImportExtractor(parser, files);
    moduleResolver = new PythonModuleResolver(new Set(files.keys()), "3.10");
    usageResolver = new PythonUsageResolver(parser, exportExtractor);
    itemResolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleResolver,
    );
    metricsAnalyzer = new PythonMetricsAnalyzer(parser);
    dependencyResolver = new PythonDependencyResolver(
      files,
      exportExtractor,
      importExtractor,
      itemResolver,
      usageResolver,
      moduleResolver,
      metricsAnalyzer,
    );
  });

  describe("Re-exporting modules", () => {
    test("should track both original and re-exporting modules as dependencies", () => {
      // Analyze dependencies for the consumer module
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies("consumer.py");

      // We expect the consumer to depend on both original.py and reexporter.py
      expect(dependencies.dependencies.size).toBe(2);

      // Check dependency on original.py
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      const originalDep = dependencies.dependencies.get("original.py");
      expect(originalDep?.isExternal).toBe(false);
      expect(originalDep?.symbols.has("original_func")).toBeTruthy();

      // Check dependency on reexporter.py (as a re-exporting module)
      expect(dependencies.dependencies.has("reexporter.py")).toBeTruthy();
      const reexporterDep = dependencies.dependencies.get("reexporter.py");
      expect(reexporterDep?.isExternal).toBe(false);
      // Re-exporting modules are tracked without symbols
      expect(reexporterDep?.symbols.size).toBe(0);
    });

    test("should not track reexporter as dependency if it's not used", () => {
      // Analyze dependencies
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "direct_consumer.py",
        );

      // Should only depend on original.py
      expect(dependencies.dependencies.size).toBe(1);
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("reexporter.py")).toBeFalsy();
    });

    test("should handle multiple levels of re-exports", () => {
      // Analyze dependencies
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "level3_consumer.py",
        );

      // Should depend on all three modules in the chain
      expect(dependencies.dependencies.size).toBe(3);
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("level1.py")).toBeTruthy();
      expect(dependencies.dependencies.has("level2.py")).toBeTruthy();

      // Original should have the symbol
      const originalDep = dependencies.dependencies.get("original.py");
      expect(originalDep?.symbols.has("original_func")).toBeTruthy();

      // Re-exporters should have no symbols
      const level1Dep = dependencies.dependencies.get("level1.py");
      const level2Dep = dependencies.dependencies.get("level2.py");
      expect(level1Dep?.symbols.size).toBe(0);
      expect(level2Dep?.symbols.size).toBe(0);
    });
  });

  describe("Variable modifications", () => {
    test("should track dependencies in each variable modification", () => {
      // Analyze dependencies for the module with modified variables
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "modified_variables.py",
        );

      // Should depend on both original.py and another.py
      expect(dependencies.dependencies.size).toBe(2);
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("another.py")).toBeTruthy();

      // Both dependencies should have their functions as used symbols
      const originalDep = dependencies.dependencies.get("original.py");
      const anotherDep = dependencies.dependencies.get("another.py");
      expect(originalDep?.symbols.has("original_func")).toBeTruthy();
      expect(anotherDep?.symbols.has("another_func")).toBeTruthy();

      // Find counter variable in symbols
      const counterSymbol = dependencies.symbols.find(
        (s) => s.id === "counter" && s.type === PYTHON_VARIABLE_TYPE,
      );
      expect(counterSymbol).toBeDefined();

      // Counter should have dependencies on both modules
      expect(counterSymbol?.dependencies.size).toBe(2);
      expect(counterSymbol?.dependencies.has("original.py")).toBeTruthy();
      expect(counterSymbol?.dependencies.has("another.py")).toBeTruthy();

      // Both dependencies should have their functions as used symbols
      const counterOriginalDep = counterSymbol?.dependencies.get("original.py");
      const counterAnotherDep = counterSymbol?.dependencies.get("another.py");
      expect(counterOriginalDep?.symbols.has("original_func")).toBeTruthy();
      expect(counterAnotherDep?.symbols.has("another_func")).toBeTruthy();
    });

    test("should track dependencies in multiple function definitions", () => {
      // Analyze dependencies for the module with multiple function definitions
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "multi_function.py",
        );

      // Should depend on both original.py and another.py
      expect(dependencies.dependencies.size).toBe(2);
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("another.py")).toBeTruthy();

      // Find multi_func function in symbols
      const multiFuncSymbol = dependencies.symbols.find(
        (s) => s.id === "multi_func",
      );
      expect(multiFuncSymbol).toBeDefined();

      // multi_func should have dependencies on both modules
      expect(multiFuncSymbol?.dependencies.size).toBe(2);
      expect(multiFuncSymbol?.dependencies.has("original.py")).toBeTruthy();
      expect(multiFuncSymbol?.dependencies.has("another.py")).toBeTruthy();
    });

    test("should handle sequential variable dependencies", () => {
      // Analyze dependencies for the module with sequential variable dependencies
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "sequential_vars.py",
        );

      // Module should depend on both original.py and another.py
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("another.py")).toBeTruthy();

      // Find all three variables in symbols
      const variables = dependencies.symbols.filter(
        (s) => s.type === PYTHON_VARIABLE_TYPE,
      );

      // Should have three variable symbols: var1, var2, var3
      const varIds = variables.map((v) => v.id);
      expect(varIds).toContain("var1");
      expect(varIds).toContain("var2");
      expect(varIds).toContain("var3");

      // Each variable should have at least some dependencies
      for (const varSymbol of variables) {
        expect(varSymbol.dependencies.size).toBeGreaterThan(0);
      }

      // At least one variable should depend on another.py
      const hasAnotherDependency = variables.some((v) =>
        v.dependencies.has("another.py")
      );
      expect(hasAnotherDependency).toBeTruthy();

      // At least one variable should depend on original.py
      const hasOriginalDependency = variables.some((v) =>
        v.dependencies.has("original.py")
      );
      expect(hasOriginalDependency).toBeTruthy();
    });

    test("should handle complex list and dictionary variables", () => {
      // Analyze dependencies for the module with complex list and dictionary variables
      const dependencies: FileDependencies = dependencyResolver
        .getFileDependencies(
          "complex_vars.py",
        );

      // Should depend on both original.py and another.py
      expect(dependencies.dependencies.size).toBe(2);

      // Find my_list variable in symbols
      const myListSymbol = dependencies.symbols.find(
        (s) => s.id === "my_list" && s.type === PYTHON_VARIABLE_TYPE,
      );
      expect(myListSymbol).toBeDefined();

      // my_list should depend on both modules
      expect(myListSymbol?.dependencies.size).toBe(2);
      expect(myListSymbol?.dependencies.has("original.py")).toBeTruthy();
      expect(myListSymbol?.dependencies.has("another.py")).toBeTruthy();

      // Find my_dict variable in symbols
      const myDictSymbol = dependencies.symbols.find(
        (s) => s.id === "my_dict" && s.type === PYTHON_VARIABLE_TYPE,
      );
      expect(myDictSymbol).toBeDefined();

      // my_dict should depend on both modules
      expect(myDictSymbol?.dependencies.size).toBe(2);
      expect(myDictSymbol?.dependencies.has("original.py")).toBeTruthy();
      expect(myDictSymbol?.dependencies.has("another.py")).toBeTruthy();
    });
  });
});
