import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers.js";
import { PythonExportExtractor } from "../exportExtractor/index.js";
import { PythonModuleResolver } from "../moduleResolver/index.js";
import { PythonUsageResolver } from "../usageResolver/index.js";
import { PythonImportExtractor } from "../importExtractor/index.js";
import { PythonItemResolver } from "../itemResolver/index.js";
import { PythonDependencyResolver } from "../dependencyResolver/index.js";
import { FileDependencies } from "./types.js";

describe("DependencyResolver", () => {
  let parser: Parser;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let usageResolver: PythonUsageResolver;
  let moduleResolver: PythonModuleResolver;
  let itemResolver: PythonItemResolver;
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
    dependencyResolver = new PythonDependencyResolver(
      files,
      exportExtractor,
      importExtractor,
      itemResolver,
      usageResolver,
      moduleResolver,
    );
  });

  describe("Re-exporting modules", () => {
    test("should track both original and re-exporting modules as dependencies", () => {
      // Analyze dependencies for the consumer module
      const dependencies: FileDependencies =
        dependencyResolver.getFileDependencies("consumer.py");

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
      const dependencies: FileDependencies =
        dependencyResolver.getFileDependencies("direct_consumer.py");

      // Should only depend on original.py
      expect(dependencies.dependencies.size).toBe(1);
      expect(dependencies.dependencies.has("original.py")).toBeTruthy();
      expect(dependencies.dependencies.has("reexporter.py")).toBeFalsy();
    });

    test("should handle multiple levels of re-exports", () => {
      // Analyze dependencies
      const dependencies: FileDependencies =
        dependencyResolver.getFileDependencies("level3_consumer.py");

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
});
