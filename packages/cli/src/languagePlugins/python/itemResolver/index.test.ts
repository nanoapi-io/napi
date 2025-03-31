import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver, PythonModule } from "../moduleResolver";
import { PythonItemResolver } from "./index";

/**
 * These tests verify the Python module resolution system, which handles:
 * 1. Basic symbol resolution through direct and nested imports
 * 2. Wildcard import behavior (from module import *)
 * 3. Alias handling (import x as y)
 * 4. Python's __all__ directive for controlling exported symbols
 * 5. Handling of private symbols (with _ prefix)
 */
describe("PythonItemResolver", () => {
  let resolver: PythonItemResolver;
  let moduleMapper: PythonModuleResolver;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    // Setup basic test modules
    files = new Map([
      // Basic modules with symbols
      [
        "moduleA.py",
        {
          path: "moduleA.py",
          rootNode: pythonParser.parse(`
            def foo(): pass
            def bar(): pass
          `).rootNode,
        },
      ],
      [
        "moduleB.py",
        {
          path: "moduleB.py",
          rootNode: pythonParser.parse(`from moduleA import foo as f, bar`)
            .rootNode,
        },
      ],
      // Modules for testing different import styles
      [
        "moduleC.py",
        {
          path: "moduleC.py",
          rootNode: pythonParser.parse(`from moduleB import *`).rootNode,
        },
      ],
      [
        "moduleD.py",
        {
          path: "moduleD.py",
          rootNode: pythonParser.parse(`from moduleB import f as fooAlias`)
            .rootNode,
        },
      ],
      [
        "moduleE.py",
        {
          path: "moduleE.py",
          rootNode: pythonParser.parse(`import moduleA`).rootNode,
        },
      ],
      [
        "moduleF.py",
        {
          path: "moduleF.py",
          rootNode: pythonParser.parse(`
            from moduleA import foo
            def local_func(): pass
          `).rootNode,
        },
      ],
      [
        "moduleG.py",
        {
          path: "moduleG.py",
          rootNode: pythonParser.parse(`
            import moduleF
            from moduleF import local_func as alias_local
          `).rootNode,
        },
      ],
      // Circular import test
      [
        "circular1.py",
        {
          path: "circular1.py",
          rootNode: pythonParser.parse(`from circular2 import circ_func`)
            .rootNode,
        },
      ],
      [
        "circular2.py",
        {
          path: "circular2.py",
          rootNode: pythonParser.parse(`from circular1 import circ_func`)
            .rootNode,
        },
      ],
      // Nested package test
      [
        "package/__init__.py",
        {
          path: "package/__init__.py",
          rootNode: pythonParser.parse(`
            from .intermediate import *
          `).rootNode,
        },
      ],
      [
        "package/intermediate.py",
        {
          path: "package/intermediate.py",
          rootNode: pythonParser.parse(`
            from .submodule import *
          `).rootNode,
        },
      ],
      [
        "package/submodule.py",
        {
          path: "package/submodule.py",
          rootNode: pythonParser.parse(`
            def deep_nested_func(): pass
          `).rootNode,
        },
      ],
      [
        "useDeepNested.py",
        {
          path: "useDeepNested.py",
          rootNode: pythonParser.parse(`
            from package import *
            deep_nested_func()
          `).rootNode,
        },
      ],
    ]);

    // Initialize resolvers
    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleMapper = new PythonModuleResolver(files);
    resolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleMapper,
    );
  });

  // ========================================================
  // SECTION: Basic Symbol Resolution (resolveItem method)
  // ========================================================
  describe("Basic Symbol Resolution", () => {
    test("resolves symbols defined directly in a module", () => {
      const moduleA = moduleMapper.pythonModule.children.get(
        "moduleA",
      ) as PythonModule;
      const result = resolver.resolveItem(moduleA, "foo");

      expect(result).toBeDefined();
      expect(result?.module.path).toBe("moduleA.py");
      expect(result?.symbol?.id).toBe("foo");
    });

    test("resolves symbols through nested imports with aliases", () => {
      const moduleG = moduleMapper.pythonModule.children.get(
        "moduleG",
      ) as PythonModule;
      const result = resolver.resolveItem(moduleG, "alias_local");

      expect(result).toBeDefined();
      expect(result?.module.path).toBe("moduleF.py");
      expect(result?.symbol?.id).toBe("local_func");
    });

    test("resolves symbols through package hierarchy", () => {
      const pkg = moduleMapper.pythonModule.children.get(
        "package",
      ) as PythonModule;
      const result = resolver.resolveItem(pkg, "deep_nested_func");

      expect(result).toBeDefined();
      expect(result?.module.path).toBe("package/submodule.py");
      expect(result?.symbol?.id).toBe("deep_nested_func");
    });

    test("gracefully handles circular imports without crashing", () => {
      const circular1 = moduleMapper.pythonModule.children.get(
        "circular1",
      ) as PythonModule;
      const result = resolver.resolveItem(circular1, "circ_func");

      expect(result).toBeUndefined();
    });

    test("resolves through multiple wildcard imports in package hierarchy", () => {
      const useDeepNestedModule = moduleMapper.pythonModule.children.get(
        "useDeepNested",
      ) as PythonModule;

      const result = resolver.resolveItem(
        useDeepNestedModule,
        "deep_nested_func",
      );

      expect(result).toBeDefined();
      expect(result?.module.path).toBe("package/submodule.py");
      expect(result?.symbol?.id).toBe("deep_nested_func");
    });
  });

  // ========================================================
  // SECTION: Symbol Collection (resolveAllSymbols method)
  // ========================================================
  describe("Symbol Collection", () => {
    test("collects all symbols defined in a module", () => {
      const moduleA = moduleMapper.pythonModule.children.get(
        "moduleA",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleA);

      expect(allSymbols.size).toBe(2);

      // Check that both symbols are properly collected
      const foo = allSymbols.get("foo");
      expect(foo).toBeDefined();
      expect(foo?.module.path).toBe("moduleA.py");
      expect(foo?.symbol?.id).toBe("foo");

      const bar = allSymbols.get("bar");
      expect(bar).toBeDefined();
      expect(bar?.module.path).toBe("moduleA.py");
      expect(bar?.symbol?.id).toBe("bar");
    });

    test("collects symbols imported with aliases", () => {
      const moduleD = moduleMapper.pythonModule.children.get(
        "moduleD",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleD);

      expect(allSymbols.has("fooAlias")).toBe(true);

      // Check that alias points to the correct original symbol
      const fooAlias = allSymbols.get("fooAlias");
      expect(fooAlias?.module.path).toBe("moduleA.py");
      expect(fooAlias?.symbol?.id).toBe("foo");
    });

    test("collects all symbols from wildcard imports", () => {
      const moduleC = moduleMapper.pythonModule.children.get(
        "moduleC",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleC);

      // moduleC imports * from moduleB which has f (alias for foo) and bar
      expect(allSymbols.has("f")).toBe(true);
      expect(allSymbols.has("bar")).toBe(true);

      // Verify symbols resolve to their original sources
      expect(allSymbols.get("f")?.module.path).toBe("moduleA.py");
      expect(allSymbols.get("bar")?.module.path).toBe("moduleA.py");
    });

    test("includes whole imported modules as namespaces", () => {
      const moduleE = moduleMapper.pythonModule.children.get(
        "moduleE",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleE);

      expect(allSymbols.has("moduleA")).toBe(true);

      const mod = allSymbols.get("moduleA");
      expect(mod?.module.path).toBe("moduleA.py");
      expect(mod?.symbol).toBeUndefined(); // No specific symbol - whole module
    });

    test("handles complex nested import chains", () => {
      const moduleG = moduleMapper.pythonModule.children.get(
        "moduleG",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleG);

      expect(allSymbols.has("moduleF")).toBe(true);
      expect(allSymbols.has("alias_local")).toBe(true);

      const aliasLocal = allSymbols.get("alias_local");
      expect(aliasLocal?.module.path).toBe("moduleF.py");
      expect(aliasLocal?.symbol?.id).toBe("local_func");
    });

    test("resolves symbols from deeply nested package imports", () => {
      const useDeepNestedModule = moduleMapper.pythonModule.children.get(
        "useDeepNested",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(useDeepNestedModule);

      expect(allSymbols.has("deep_nested_func")).toBe(true);

      const deepNestedFunc = allSymbols.get("deep_nested_func");
      expect(deepNestedFunc?.module.path).toBe("package/submodule.py");
    });

    test("doesn't crash with circular import references", () => {
      const circular1 = moduleMapper.pythonModule.children.get(
        "circular1",
      ) as PythonModule;

      expect(() => resolver.resolveAllSymbols(circular1)).not.toThrow();
    });
  });

  // ========================================================
  // SECTION: __all__ directive and visibility handling
  // ========================================================
  describe("Symbol Visibility and __all__ Directive", () => {
    beforeEach(() => {
      // Add test modules for __all__ directive and symbol visibility testing
      files.set("moduleWithAll.py", {
        path: "moduleWithAll.py",
        rootNode: pythonParser.parse(`
          def public_func(): pass
          def private_func(): pass
          
          __all__ = ['public_func']
        `).rootNode,
      });

      files.set("importAllModule.py", {
        path: "importAllModule.py",
        rootNode: pythonParser.parse(`
          from moduleWithAll import *
        `).rootNode,
      });

      files.set("moduleWithMultipleAll.py", {
        path: "moduleWithMultipleAll.py",
        rootNode: pythonParser.parse(`
          def func1(): pass
          def func2(): pass
          class MyClass:
            pass
          
          __all__ = ['func1', 'MyClass']
        `).rootNode,
      });

      // Modules for testing nested __all__ behavior
      files.set("nestedAll/__init__.py", {
        path: "nestedAll/__init__.py",
        rootNode: pythonParser.parse(`
          from .internal import *
          
          def init_func(): pass
          def hidden_func(): pass
          
          __all__ = ['init_func', 'visible_internal_func']
        `).rootNode,
      });

      files.set("nestedAll/internal.py", {
        path: "nestedAll/internal.py",
        rootNode: pythonParser.parse(`
          def visible_internal_func(): pass
          def hidden_internal_func(): pass
          
          __all__ = ['visible_internal_func']
        `).rootNode,
      });

      files.set("useNestedAll.py", {
        path: "useNestedAll.py",
        rootNode: pythonParser.parse(`
          from nestedAll import *
        `).rootNode,
      });

      // Modules for testing private symbol handling
      files.set("moduleWithPrivate.py", {
        path: "moduleWithPrivate.py",
        rootNode: pythonParser.parse(`
          def public_func(): pass
          def _private_func(): pass
          _PRIVATE_CONST = 42
          PUBLIC_CONST = 100
        `).rootNode,
      });

      files.set("importAllPrivate.py", {
        path: "importAllPrivate.py",
        rootNode: pythonParser.parse(`
          from moduleWithPrivate import *
        `).rootNode,
      });

      files.set("importExplicitPrivate.py", {
        path: "importExplicitPrivate.py",
        rootNode: pythonParser.parse(`
          from moduleWithPrivate import _private_func, _PRIVATE_CONST
        `).rootNode,
      });

      // Module using __all__ to override visibility conventions
      files.set("mixedVisibilityModule.py", {
        path: "mixedVisibilityModule.py",
        rootNode: pythonParser.parse(`
          def public_func(): pass
          def another_public(): pass
          def _private_func(): pass
          
          # Include a private symbol in __all__ and exclude a public symbol
          __all__ = ['public_func', '_private_func']
        `).rootNode,
      });

      files.set("importMixedVisibility.py", {
        path: "importMixedVisibility.py",
        rootNode: pythonParser.parse(`
          from mixedVisibilityModule import *
        `).rootNode,
      });

      // Modules for testing reexported private symbols
      files.set("reExportPrivate/__init__.py", {
        path: "reExportPrivate/__init__.py",
        rootNode: pythonParser.parse(`
          from .internal import *
          
          `).rootNode,
      });

      files.set("reExportPrivate/__init__.py", {
        path: "reExportPrivate/__init__.py",
        rootNode: pythonParser.parse(`
            from .internal import *
            
            # Re-export a private symbol from internal
            __all__ = ['make_public']
          `).rootNode,
      });

      files.set("reExportPrivate/internal.py", {
        path: "reExportPrivate/internal.py",
        rootNode: pythonParser.parse(`
            def _internal_func(): pass
            
            # Make a private function available through __all__
            __all__ = ['_internal_func']
            
            # Alias for the private function
            make_public = _internal_func
          `).rootNode,
      });

      files.set("useReExportPrivate.py", {
        path: "useReExportPrivate.py",
        rootNode: pythonParser.parse(`
            from reExportPrivate import *
          `).rootNode,
      });

      // Re-initialize the resolvers with new files
      exportExtractor = new PythonExportExtractor(pythonParser, files);
      importExtractor = new PythonImportExtractor(pythonParser, files);
      moduleMapper = new PythonModuleResolver(files);

      resolver = new PythonItemResolver(
        exportExtractor,
        importExtractor,
        moduleMapper,
      );
    });

    test("respects __all__ in direct symbol collection", () => {
      const moduleWithAll = moduleMapper.pythonModule.children.get(
        "moduleWithAll",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(moduleWithAll);

      // Should only contain the symbol explicitly listed in __all__
      expect(allSymbols.size).toBe(1);
      expect(allSymbols.has("public_func")).toBe(true);
      expect(allSymbols.has("private_func")).toBe(false);
    });

    test("respects __all__ with wildcard imports", () => {
      const importAllModule = moduleMapper.pythonModule.children.get(
        "importAllModule",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(importAllModule);

      // Should only import the public_func from moduleWithAll
      expect(allSymbols.has("public_func")).toBe(true);
      expect(allSymbols.has("private_func")).toBe(false);
    });

    test("handles multiple symbols in __all__", () => {
      const multipleAllModule = moduleMapper.pythonModule.children.get(
        "moduleWithMultipleAll",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(multipleAllModule);

      // Should only contain the symbols explicitly listed in __all__
      expect(allSymbols.size).toBe(2);
      expect(allSymbols.has("func1")).toBe(true);
      expect(allSymbols.has("MyClass")).toBe(true);
      expect(allSymbols.has("func2")).toBe(false);
    });

    test("handles nested wildcard imports with __all__ directives", () => {
      const useNestedAll = moduleMapper.pythonModule.children.get(
        "useNestedAll",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(useNestedAll);

      // Should respect __all__ at both levels
      expect(allSymbols.has("init_func")).toBe(true); // From nestedAll/__init__.py
      expect(allSymbols.has("visible_internal_func")).toBe(true); // Re-exported in __all__ from internal

      expect(allSymbols.has("hidden_func")).toBe(false); // Not in __all__ of __init__.py
      expect(allSymbols.has("hidden_internal_func")).toBe(false); // Not in __all__ of internal.py
    });

    test("handles symbols resolution from modules with __all__", () => {
      const useNestedAll = moduleMapper.pythonModule.children.get(
        "useNestedAll",
      ) as PythonModule;

      // Should correctly resolve the symbol to its source module
      const resolvedInternalFunc = resolver.resolveItem(
        useNestedAll,
        "visible_internal_func",
      );
      expect(resolvedInternalFunc).toBeDefined();
      expect(resolvedInternalFunc?.module.path).toBe("nestedAll/internal.py");

      // Should correctly resolve the symbol from __init__.py
      const resolvedInitFunc = resolver.resolveItem(useNestedAll, "init_func");
      expect(resolvedInitFunc).toBeDefined();
      expect(resolvedInitFunc?.module.path).toBe("nestedAll/__init__.py");
    });

    test("excludes private symbols in wildcard imports without __all__", () => {
      const importAllPrivate = moduleMapper.pythonModule.children.get(
        "importAllPrivate",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(importAllPrivate);

      // Should import public symbols but not private ones (with _ prefix)
      expect(allSymbols.has("public_func")).toBe(true);
      expect(allSymbols.has("PUBLIC_CONST")).toBe(true);
      expect(allSymbols.has("_private_func")).toBe(false);
      expect(allSymbols.has("_PRIVATE_CONST")).toBe(false);
    });

    test("allows explicit imports of private symbols", () => {
      const importExplicitPrivate = moduleMapper.pythonModule.children.get(
        "importExplicitPrivate",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(importExplicitPrivate);

      // Should have explicitly imported private symbols
      expect(allSymbols.has("_private_func")).toBe(true);
      expect(allSymbols.has("_PRIVATE_CONST")).toBe(true);

      // Check that these resolve to the correct source
      const privateFunc = allSymbols.get("_private_func");
      expect(privateFunc).toBeDefined();
      expect(privateFunc?.module.path).toBe("moduleWithPrivate.py");
    });

    test("honors __all__ over naming conventions for wildcard imports", () => {
      const importMixedVisibility = moduleMapper.pythonModule.children.get(
        "importMixedVisibility",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(importMixedVisibility);

      // Should import only what's in __all__, regardless of naming convention
      expect(allSymbols.has("public_func")).toBe(true); // In __all__
      expect(allSymbols.has("_private_func")).toBe(true); // In __all__ despite _ prefix
      expect(allSymbols.has("another_public")).toBe(false); // Not in __all__
    });

    test("correctly handles re-exported private symbols via __all__", () => {
      const useReExportPrivate = moduleMapper.pythonModule.children.get(
        "useReExportPrivate",
      ) as PythonModule;
      const allSymbols = resolver.resolveAllSymbols(useReExportPrivate);

      // Should only get the make_public symbol that's in package __all__
      expect(allSymbols.has("make_public")).toBe(true);
      expect(allSymbols.has("_internal_func")).toBe(false); // Not re-exported in package __all__

      // Verify it resolves to the correct implementation
      const makePublic = allSymbols.get("make_public");
      expect(makePublic).toBeDefined();
      expect(makePublic?.module.path).toBe("reExportPrivate/internal.py");
    });
  });
});
