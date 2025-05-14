import { beforeEach, describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type Parser from "npm:tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers.ts";
import { PythonExportExtractor } from "../exportExtractor/index.ts";
import { PythonImportExtractor } from "../importExtractor/index.ts";
import { PythonModuleResolver } from "../moduleResolver/index.ts";
import { PythonItemResolver } from "./index.ts";
import { PYTHON_INTERNAL_MODULE_TYPE } from "./types.ts";

/**
 * These tests verify the Python symbol resolution system, which handles:
 * 1. Basic symbol resolution through direct and nested imports
 * 2. Wildcard import behavior (from module import *)
 * 3. Alias handling (import x as y)
 * 4. Python's __all__ directive for controlling exported symbols
 * 5. Handling of private symbols (with _ prefix)
 * 6. Multiple import styles and their precedence
 * 7. Symbol visibility and shadowing rules
 * 8. Circular imports
 */
describe("PythonItemResolver", () => {
  let resolver: PythonItemResolver;
  let moduleResolver: PythonModuleResolver;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    // Setup basic test modules
    files = new Map([
      // TEST CASE 1: Shadowing in nested imports
      // Module with original definition
      [
        "shadow_nest_1.py",
        {
          path: "shadow_nest_1.py",
          rootNode: pythonParser.parse(`
            def shadow_func(): return "original"
          `).rootNode,
        },
      ],
      // Module that imports and overrides with local definition
      [
        "shadow_nest_2.py",
        {
          path: "shadow_nest_2.py",
          rootNode: pythonParser.parse(`
            from shadow_nest_1 import shadow_func
            def shadow_func(): return "override"  # This local definition should shadow the import
          `).rootNode,
        },
      ],
      // Module that imports from the module with shadowing
      [
        "shadow_nest_user.py",
        {
          path: "shadow_nest_user.py",
          rootNode: pythonParser.parse(`
            from shadow_nest_2 import shadow_func
          `).rootNode,
        },
      ],

      // TEST CASE 2: Importing submodules from packages with qualified names
      [
        "deep_package/__init__.py",
        {
          path: "deep_package/__init__.py",
          rootNode: pythonParser.parse(`
            # Empty init file
          `).rootNode,
        },
      ],
      [
        "deep_package/submod.py",
        {
          path: "deep_package/submod.py",
          rootNode: pythonParser.parse(`
            def submod_func(): pass
          `).rootNode,
        },
      ],
      [
        "import_submodule.py",
        {
          path: "import_submodule.py",
          rootNode: pythonParser.parse(`
            # Import the submodule directly
            import deep_package.submod
            # Use the submodule qualified name
            def use_func():
                return deep_package.submod.submod_func()
          `).rootNode,
        },
      ],

      // TEST CASE 3: Deep package hierarchies with multiple layers of __all__ inheritance
      [
        "nested_all_pkg/__init__.py",
        {
          path: "nested_all_pkg/__init__.py",
          rootNode: pythonParser.parse(`
            from .level1 import *
            from .direct import direct_func
            
            __all__ = ['direct_func', 'level1_func', 'level2_deep_func']
          `).rootNode,
        },
      ],
      [
        "nested_all_pkg/direct.py",
        {
          path: "nested_all_pkg/direct.py",
          rootNode: pythonParser.parse(`
            def direct_func(): pass
            def not_exported(): pass
          `).rootNode,
        },
      ],
      [
        "nested_all_pkg/level1.py",
        {
          path: "nested_all_pkg/level1.py",
          rootNode: pythonParser.parse(`
            from .level2 import *
            
            def level1_func(): pass
            def level1_hidden(): pass
            
            __all__ = ['level1_func', 'level2_deep_func']
          `).rootNode,
        },
      ],
      [
        "nested_all_pkg/level2.py",
        {
          path: "nested_all_pkg/level2.py",
          rootNode: pythonParser.parse(`
            def level2_func(): pass
            def level2_deep_func(): pass
            def level2_hidden(): pass
            
            __all__ = ['level2_func', 'level2_deep_func']
          `).rootNode,
        },
      ],
      [
        "use_nested_all.py",
        {
          path: "use_nested_all.py",
          rootNode: pythonParser.parse(`
            from nested_all_pkg import *
          `).rootNode,
        },
      ],

      // Basic modules with symbols
      [
        "moduleA.py",
        {
          path: "moduleA.py",
          rootNode: pythonParser.parse(`
            def foo(): pass
            def bar(): pass
            CONSTANT = 42
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
      // Add test module for testing conflicting imports
      [
        "override_imports.py",
        {
          path: "override_imports.py",
          rootNode: pythonParser.parse(`
            from moduleA import foo  # foo from moduleA
            from multi_wildcard1 import common as foo  # This should override the previous import
          `).rootNode,
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
          rootNode: pythonParser.parse(`
            from moduleB import f as fooAlias
            from moduleA import bar as barAlias
          `).rootNode,
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
      // Modules for import order and precedence testing
      [
        "precedence.py",
        {
          path: "precedence.py",
          rootNode: pythonParser.parse(`
            # Define a local symbol
            def duplicate(): 
                return "local"
                
            # Import a symbol with same name - this should be shadowed
            from moduleA import CONSTANT as duplicate
            
            # Wildcard import - should not override existing names
            from moduleB import *
          `).rootNode,
        },
      ],
      [
        "wildcard_precedence.py",
        {
          path: "wildcard_precedence.py",
          rootNode: pythonParser.parse(`
            # First wildcard import
            from moduleA import *
            
            # Second wildcard import
            from moduleB import *
            
            # Third explicit import - should override any previous wildcards
            from moduleA import foo as bar
          `).rootNode,
        },
      ],
      // Circular import test
      [
        "circular1.py",
        {
          path: "circular1.py",
          rootNode: pythonParser.parse(`
            def circular1_func(): pass
            from circular2 import circular2_func
          `).rootNode,
        },
      ],
      [
        "circular2.py",
        {
          path: "circular2.py",
          rootNode: pythonParser.parse(`
            def circular2_func(): pass
            from circular1 import circular1_func
          `).rootNode,
        },
      ],
      // Nested package test
      [
        "package/__init__.py",
        {
          path: "package/__init__.py",
          rootNode: pythonParser.parse(`
            from .submodule import sub_func
            from .intermediate import *
          `).rootNode,
        },
      ],
      [
        "package/intermediate.py",
        {
          path: "package/intermediate.py",
          rootNode: pythonParser.parse(`
            def intermediate_func(): pass
            from .submodule import *
          `).rootNode,
        },
      ],
      [
        "package/submodule.py",
        {
          path: "package/submodule.py",
          rootNode: pythonParser.parse(`
            def sub_func(): pass
            def deep_nested_func(): pass
          `).rootNode,
        },
      ],
      [
        "usePackage.py",
        {
          path: "usePackage.py",
          rootNode: pythonParser.parse(`
            from package import *
            
            # This should be available from the wildcard import
            deep_nested_func()
          `).rootNode,
        },
      ],
      // __all__ directive test modules
      [
        "moduleWithAll.py",
        {
          path: "moduleWithAll.py",
          rootNode: pythonParser.parse(`
            def public_func(): pass
            def another_func(): pass
            def _private_func(): pass
            
            __all__ = ['public_func']
          `).rootNode,
        },
      ],
      [
        "importAllModule.py",
        {
          path: "importAllModule.py",
          rootNode: pythonParser.parse(`
            from moduleWithAll import *
          `).rootNode,
        },
      ],
      [
        "importSpecificFromAll.py",
        {
          path: "importSpecificFromAll.py",
          rootNode: pythonParser.parse(`
            from moduleWithAll import another_func, _private_func
          `).rootNode,
        },
      ],
      // Private symbol handling
      [
        "privateSymbols.py",
        {
          path: "privateSymbols.py",
          rootNode: pythonParser.parse(`
            def public_function(): pass
            def _private_function(): pass
            _PRIVATE_CONSTANT = 123
            PUBLIC_CONSTANT = 456
          `).rootNode,
        },
      ],
      [
        "importPrivate.py",
        {
          path: "importPrivate.py",
          rootNode: pythonParser.parse(`
            from privateSymbols import *
            
            # Should only import public symbols through wildcard
          `).rootNode,
        },
      ],
      [
        "explicitPrivate.py",
        {
          path: "explicitPrivate.py",
          rootNode: pythonParser.parse(`
            from privateSymbols import _private_function, PUBLIC_CONSTANT
            
            # Explicit imports can include private symbols
          `).rootNode,
        },
      ],
      // Complex __all__ overriding private convention
      [
        "allOverride.py",
        {
          path: "allOverride.py",
          rootNode: pythonParser.parse(`
            def regular_func(): pass
            def _private_func(): pass
            
            # Explicitly export a private symbol through __all__
            __all__ = ['regular_func', '_private_func']
          `).rootNode,
        },
      ],
      [
        "importAllOverride.py",
        {
          path: "importAllOverride.py",
          rootNode: pythonParser.parse(`
            from allOverride import *
            
            # Should import both regular_func and _private_func because they're in __all__
          `).rootNode,
        },
      ],
      // Namespace packages
      [
        "namespace_pkg/module1.py",
        {
          path: "namespace_pkg/module1.py",
          rootNode: pythonParser.parse(`
            def ns_func1(): pass
          `).rootNode,
        },
      ],
      [
        "namespace_pkg/module2.py",
        {
          path: "namespace_pkg/module2.py",
          rootNode: pythonParser.parse(`
            def ns_func2(): pass
            from .module1 import ns_func1
          `).rootNode,
        },
      ],
      // Absolute vs relative imports
      [
        "package2/__init__.py",
        {
          path: "package2/__init__.py",
          rootNode: pythonParser.parse(`
            from .relmod import rel_func
            absolute_var = "from init"
          `).rootNode,
        },
      ],
      [
        "package2/relmod.py",
        {
          path: "package2/relmod.py",
          rootNode: pythonParser.parse(`
            def rel_func(): pass
            from . import absolute_var
          `).rootNode,
        },
      ],
      [
        "package2/absmod.py",
        {
          path: "package2/absmod.py",
          rootNode: pythonParser.parse(`
            def abs_func(): pass
            from package2 import absolute_var
          `).rootNode,
        },
      ],
      // Multiple wildcard imports
      [
        "multi_wildcard1.py",
        {
          path: "multi_wildcard1.py",
          rootNode: pythonParser.parse(`
            def unique1(): pass
            def common(): return "from1"
          `).rootNode,
        },
      ],
      [
        "multi_wildcard2.py",
        {
          path: "multi_wildcard2.py",
          rootNode: pythonParser.parse(`
            def unique2(): pass
            def common(): return "from2"
          `).rootNode,
        },
      ],
      [
        "multi_wildcards.py",
        {
          path: "multi_wildcards.py",
          rootNode: pythonParser.parse(`
            from multi_wildcard1 import *
            from multi_wildcard2 import *
            
            # Should have unique1, unique2, and common (from multi_wildcard1 since it comes first)
          `).rootNode,
        },
      ],
    ]);

    // Initialize resolvers
    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleResolver = new PythonModuleResolver(new Set(files.keys()), "3.13");
    resolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleResolver,
    );
  });

  // ========================================================
  // SECTION: Advanced Import Scenarios and Shadowing
  // ========================================================
  describe("Advanced Import Scenarios and Shadowing", () => {
    test("handles shadowing in nested imports", () => {
      const shadowNest2 = moduleResolver.getModuleFromFilePath(
        "shadow_nest_2.py",
      );
      expect(shadowNest2).toBeDefined();

      // When importing shadow_func, should get the local definition from shadow_nest_2,
      // not the one imported from shadow_nest_1
      const directResult = resolver.resolveItem(shadowNest2, "shadow_func");
      expect(directResult).toBeDefined();
      expect(directResult?.module?.path).toBe("shadow_nest_2.py"); // Local definition, not from shadow_nest_1

      // Test that another module importing from shadow_nest_2 gets the shadowed version
      const shadowUser = moduleResolver.getModuleFromFilePath(
        "shadow_nest_user.py",
      );
      expect(shadowUser).toBeDefined();

      const userResult = resolver.resolveItem(shadowUser, "shadow_func");
      expect(userResult).toBeDefined();
      expect(userResult?.module?.path).toBe("shadow_nest_2.py"); // Should get the shadowed version
    });

    test("handles deep package hierarchies with multiple layers of __all__ inheritance", () => {
      const useNestedAll = moduleResolver.getModuleFromFilePath(
        "use_nested_all.py",
      );
      expect(useNestedAll).toBeDefined();

      // Should be able to resolve symbols listed in the top-level __all__
      const directResult = resolver.resolveItem(useNestedAll, "direct_func");
      expect(directResult).toBeDefined();
      expect(directResult?.module?.path).toBe("nested_all_pkg/direct.py");

      const level1Result = resolver.resolveItem(useNestedAll, "level1_func");
      expect(level1Result).toBeDefined();
      expect(level1Result?.module?.path).toBe("nested_all_pkg/level1.py");

      const deepResult = resolver.resolveItem(useNestedAll, "level2_deep_func");
      expect(deepResult).toBeDefined();
      expect(deepResult?.module?.path).toBe("nested_all_pkg/level2.py");

      // Should NOT import level2_func even though it's in level2's __all__
      // but not in the top-level package __all__
      const level2Result = resolver.resolveItem(useNestedAll, "level2_func");
      expect(level2Result).toBeUndefined();

      // Should NOT import any of the hidden functions
      const level1HiddenResult = resolver.resolveItem(
        useNestedAll,
        "level1_hidden",
      );
      expect(level1HiddenResult).toBeUndefined();

      const level2HiddenResult = resolver.resolveItem(
        useNestedAll,
        "level2_hidden",
      );
      expect(level2HiddenResult).toBeUndefined();

      const notExportedResult = resolver.resolveItem(
        useNestedAll,
        "not_exported",
      );
      expect(notExportedResult).toBeUndefined();
    });
  });

  // ========================================================
  // SECTION: Basic Item Resolution
  // ========================================================
  describe("Basic Item Resolution", () => {
    test("resolves symbols defined directly in a module", () => {
      const moduleA = moduleResolver.getModuleFromFilePath("moduleA.py");
      expect(moduleA).toBeDefined();

      const result = resolver.resolveItem(moduleA, "foo");
      expect(result).toBeDefined();
      expect(result?.type).toBe(PYTHON_INTERNAL_MODULE_TYPE);
      expect(result?.module?.path).toBe("moduleA.py");
      expect(result?.symbol?.id).toBe("foo");
    });

    test("resolves symbols via explicit imports", () => {
      const moduleB = moduleResolver.getModuleFromFilePath("moduleB.py");
      expect(moduleB).toBeDefined();

      // Test alias resolution
      const aliasResult = resolver.resolveItem(moduleB, "f");
      expect(aliasResult).toBeDefined();
      expect(aliasResult?.type).toBe(PYTHON_INTERNAL_MODULE_TYPE);
      expect(aliasResult?.module?.path).toBe("moduleA.py");
      expect(aliasResult?.symbol?.id).toBe("foo");

      // Test direct import resolution
      const directResult = resolver.resolveItem(moduleB, "bar");
      expect(directResult).toBeDefined();
      expect(directResult?.type).toBe(PYTHON_INTERNAL_MODULE_TYPE);
      expect(directResult?.module?.path).toBe("moduleA.py");
      expect(directResult?.symbol?.id).toBe("bar");
    });

    test("resolves symbols via wildcard imports", () => {
      const moduleC = moduleResolver.getModuleFromFilePath("moduleC.py");
      expect(moduleC).toBeDefined();

      // Test resolving a symbol that was imported via wildcard from moduleB
      const wildcardResult = resolver.resolveItem(moduleC, "f");
      expect(wildcardResult).toBeDefined();
      expect(wildcardResult?.type).toBe(PYTHON_INTERNAL_MODULE_TYPE);
      expect(wildcardResult?.module?.path).toBe("moduleA.py");
      expect(wildcardResult?.symbol?.id).toBe("foo");

      // Also test bar which was imported into moduleB and then wildcard imported into moduleC
      const anotherResult = resolver.resolveItem(moduleC, "bar");
      expect(anotherResult).toBeDefined();
      expect(anotherResult?.module?.path).toBe("moduleA.py");
      expect(anotherResult?.symbol?.id).toBe("bar");
    });

    test("resolves module imports", () => {
      const moduleE = moduleResolver.getModuleFromFilePath("moduleE.py");
      expect(moduleE).toBeDefined();

      // Test resolving a module import
      const moduleResult = resolver.resolveItem(moduleE, "moduleA");
      expect(moduleResult).toBeDefined();
      expect(moduleResult?.type).toBe(PYTHON_INTERNAL_MODULE_TYPE);
      expect(moduleResult?.module?.path).toBe("moduleA.py");
      expect(moduleResult?.symbol).toBeUndefined(); // No specific symbol when importing whole module
    });
  });

  // ========================================================
  // SECTION: Import Precedence and Shadowing
  // ========================================================
  describe("Import Precedence and Shadowing", () => {
    test("local definitions override imports", () => {
      const precedenceModule = moduleResolver.getModuleFromFilePath(
        "precedence.py",
      );
      expect(precedenceModule).toBeDefined();

      // The local 'duplicate' function should be returned, not the imported one
      const result = resolver.resolveItem(precedenceModule, "duplicate");
      expect(result).toBeDefined();
      expect(result?.module?.path).toBe("precedence.py");
      expect(result?.symbol?.id).toBe("duplicate");
    });

    test("explicit imports override wildcard imports", () => {
      const wildcardPrecedence = moduleResolver.getModuleFromFilePath(
        "wildcard_precedence.py",
      );
      expect(wildcardPrecedence).toBeDefined();

      // The 'bar' symbol is explicitly imported from moduleA.foo, overriding any wildcards
      const result = resolver.resolveItem(wildcardPrecedence, "bar");
      expect(result).toBeDefined();
      expect(result?.module?.path).toBe("moduleA.py");
      expect(result?.symbol?.id).toBe("foo");
    });

    test("earlier wildcard imports shadow later ones", () => {
      const multiWildcards = moduleResolver.getModuleFromFilePath(
        "multi_wildcards.py",
      );
      expect(multiWildcards).toBeDefined();

      // The 'common' function should come from the first wildcard import
      const wildcardSymbols = resolver.getWildcardSymbols(multiWildcards);

      // Check for the functions from both modules
      expect(wildcardSymbols.has("unique1")).toBeTruthy();
      expect(wildcardSymbols.has("unique2")).toBeTruthy();

      // But the common function should come from the first module
      const commonFunc = resolver.resolveItem(multiWildcards, "common");
      expect(commonFunc).toBeDefined();
      expect(commonFunc?.module?.path).toBe("multi_wildcard1.py");
    });

    test("later imports override earlier imports with the same name", () => {
      const overrideModule = moduleResolver.getModuleFromFilePath(
        "override_imports.py",
      );
      expect(overrideModule).toBeDefined();

      // The 'foo' symbol should come from the last import (multi_wildcard1.common), not the first one (moduleA.foo)
      const result = resolver.resolveItem(overrideModule, "foo");
      expect(result).toBeDefined();
      expect(result?.module?.path).toBe("multi_wildcard1.py");
      expect(result?.symbol?.id).toBe("common");
    });
  });

  // ========================================================
  // SECTION: Visibility and __all__ Directive
  // ========================================================
  describe("Visibility and __all__ Directive", () => {
    test("respects __all__ in wildcard imports", () => {
      const importAllModule = moduleResolver.getModuleFromFilePath(
        "importAllModule.py",
      );
      expect(importAllModule).toBeDefined();

      // Should find public_func which is in __all__
      const publicResult = resolver.resolveItem(importAllModule, "public_func");
      expect(publicResult).toBeDefined();
      expect(publicResult?.module?.path).toBe("moduleWithAll.py");

      // Should NOT find another_func which is not in __all__
      const anotherResult = resolver.resolveItem(
        importAllModule,
        "another_func",
      );
      expect(anotherResult).toBeUndefined();

      // Should NOT find _private_func which is neither in __all__ nor would be included due to _ prefix
      const privateResult = resolver.resolveItem(
        importAllModule,
        "_private_func",
      );
      expect(privateResult).toBeUndefined();
    });

    test("explicit imports override __all__ restrictions", () => {
      const importSpecific = moduleResolver.getModuleFromFilePath(
        "importSpecificFromAll.py",
      );
      expect(importSpecific).toBeDefined();

      // Should find explicitly imported symbols even if not in __all__
      const anotherResult = resolver.resolveItem(
        importSpecific,
        "another_func",
      );
      expect(anotherResult).toBeDefined();
      expect(anotherResult?.module?.path).toBe("moduleWithAll.py");

      // Should also find explicitly imported private symbols
      const privateResult = resolver.resolveItem(
        importSpecific,
        "_private_func",
      );
      expect(privateResult).toBeDefined();
      expect(privateResult?.module?.path).toBe("moduleWithAll.py");
    });

    test("excludes private symbols in wildcard imports without __all__", () => {
      const importPrivate = moduleResolver.getModuleFromFilePath(
        "importPrivate.py",
      );
      expect(importPrivate).toBeDefined();

      // Should find public symbols through wildcard
      const publicResult = resolver.resolveItem(
        importPrivate,
        "public_function",
      );
      expect(publicResult).toBeDefined();

      const constantResult = resolver.resolveItem(
        importPrivate,
        "PUBLIC_CONSTANT",
      );
      expect(constantResult).toBeDefined();

      // Should NOT find private symbols through wildcard
      const privateResult = resolver.resolveItem(
        importPrivate,
        "_private_function",
      );
      expect(privateResult).toBeUndefined();

      const privateConstResult = resolver.resolveItem(
        importPrivate,
        "_PRIVATE_CONSTANT",
      );
      expect(privateConstResult).toBeUndefined();
    });

    test("__all__ can override private symbol conventions", () => {
      const importAllOverride = moduleResolver.getModuleFromFilePath(
        "importAllOverride.py",
      );
      expect(importAllOverride).toBeDefined();

      // Should find both regular and private symbols listed in __all__
      const regularResult = resolver.resolveItem(
        importAllOverride,
        "regular_func",
      );
      expect(regularResult).toBeDefined();

      // Even though it starts with _, it should be imported because it's in __all__
      const privateResult = resolver.resolveItem(
        importAllOverride,
        "_private_func",
      );
      expect(privateResult).toBeDefined();
    });
  });

  // ========================================================
  // SECTION: Complex Import Scenarios
  // ========================================================
  describe("Complex Import Scenarios", () => {
    test("handles circular imports gracefully", () => {
      const circular1 = moduleResolver.getModuleFromFilePath("circular1.py");
      const circular2 = moduleResolver.getModuleFromFilePath("circular1.py");
      expect(circular1).toBeDefined();
      expect(circular2).toBeDefined();

      // Should be able to resolve the function defined in circular1
      const func1Result = resolver.resolveItem(circular1, "circular1_func");
      expect(func1Result).toBeDefined();
      expect(func1Result?.module?.path).toBe("circular1.py");

      // Should also resolve the function imported from circular2
      const func2Result = resolver.resolveItem(circular1, "circular2_func");
      expect(func2Result).toBeDefined();
      expect(func2Result?.module?.path).toBe("circular2.py");

      // And the reverse should work too
      const func1FromCircular2 = resolver.resolveItem(
        circular2,
        "circular1_func",
      );
      expect(func1FromCircular2).toBeDefined();
      expect(func1FromCircular2?.module?.path).toBe("circular1.py");
    });

    test("resolves symbols through package hierarchy with wildcard imports", () => {
      const usePackage = moduleResolver.getModuleFromFilePath("usePackage");
      expect(usePackage).toBeDefined();

      // Should be able to resolve the deeply nested function through multiple wildcards
      const deepResult = resolver.resolveItem(usePackage, "deep_nested_func");
      expect(deepResult).toBeDefined();
      expect(deepResult?.module?.path).toBe("package/submodule.py");

      // Also test the intermediate function
      const intermediateResult = resolver.resolveItem(
        usePackage,
        "intermediate_func",
      );
      expect(intermediateResult).toBeDefined();
      expect(intermediateResult?.module?.path).toBe("package/intermediate.py");

      // And the explicit import in __init__.py
      const subFuncResult = resolver.resolveItem(usePackage, "sub_func");
      expect(subFuncResult).toBeDefined();
      expect(subFuncResult?.module?.path).toBe("package/submodule.py");
    });

    test("handles relative imports in packages", () => {
      const package2 = moduleResolver.getModuleFromFilePath("package2.py");
      const relmod = moduleResolver.getModuleFromFilePath("package2/relmod.py");
      const absmod = moduleResolver.getModuleFromFilePath("package2/absmod.py");

      expect(package2).toBeDefined();
      expect(relmod).toBeDefined();
      expect(absmod).toBeDefined();

      // Test relative import from __init__ to submodule
      const relFuncFromInit = resolver.resolveItem(package2, "rel_func");
      expect(relFuncFromInit).toBeDefined();
      expect(relFuncFromInit?.module?.path).toBe("package2/relmod.py");

      // Test relative import from submodule to package
      const varFromRelmod = resolver.resolveItem(relmod, "absolute_var");
      expect(varFromRelmod).toBeDefined();
      expect(varFromRelmod?.module?.path).toBe("package2/__init__.py");

      // Test absolute import from submodule to package
      const varFromAbsmod = resolver.resolveItem(absmod, "absolute_var");
      expect(varFromAbsmod).toBeDefined();
      expect(varFromAbsmod?.module?.path).toBe("package2/__init__.py");
    });
  });

  // ========================================================
  // SECTION: Wildcard Symbol Collection
  // ========================================================
  describe("Wildcard Symbol Collection", () => {
    test("collects all symbols for wildcard exports respecting __all__", () => {
      const moduleWithAll = moduleResolver.getModuleFromFilePath(
        "moduleWithAll.py",
      );
      expect(moduleWithAll).toBeDefined();

      const symbols = resolver.getWildcardSymbols(moduleWithAll);

      // Should only contain symbols listed in __all__
      expect(symbols.size).toBe(1);
      expect(symbols.has("public_func")).toBeTruthy();
      expect(symbols.has("another_func")).toBeFalsy();
      expect(symbols.has("_private_func")).toBeFalsy();
    });

    test("collects all non-private symbols for wildcard exports without __all__", () => {
      const privateSymbols = moduleResolver.getModuleFromFilePath(
        "privateSymbols.py",
      );
      expect(privateSymbols).toBeDefined();

      const symbols = resolver.getWildcardSymbols(privateSymbols);

      // Should only contain public symbols (no _ prefix)
      expect(symbols.has("public_function")).toBeTruthy();
      expect(symbols.has("PUBLIC_CONSTANT")).toBeTruthy();
      expect(symbols.has("_private_function")).toBeFalsy();
      expect(symbols.has("_PRIVATE_CONSTANT")).toBeFalsy();
    });

    test("combines symbols from wildcard imports with local symbols", () => {
      const moduleC = moduleResolver.getModuleFromFilePath("moduleC.py");
      expect(moduleC).toBeDefined();

      const symbols = resolver.getWildcardSymbols(moduleC);

      // Should have all the symbols from moduleB
      expect(symbols.has("f")).toBeTruthy(); // alias from moduleB
      expect(symbols.has("bar")).toBeTruthy(); // direct import in moduleB

      // Verify they resolve to the correct original source
      const fSymbol = symbols.get("f");
      expect(fSymbol?.module?.path).toBe("moduleA.py");
      expect(fSymbol?.symbol?.id).toBe("foo");
    });
  });
});
