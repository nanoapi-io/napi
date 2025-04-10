import { beforeEach, describe, expect, test, vi } from "vitest";
import Parser from "tree-sitter";
import { PythonModuleResolver } from "./index";
import {
  PYTHON_MODULE_TYPE,
  PYTHON_NAMESPACE_MODULE_TYPE,
  PYTHON_PACKAGE_MODULE_TYPE,
} from "./types";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { sep } from "path";

// Use the real parser for Python
const parser = pythonParser;

// Helper function to create a map of files with empty content
function createFiles(paths: string[]) {
  const fileMap = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();

  paths.forEach((path) => {
    fileMap.set(path, {
      path,
      rootNode: parser.parse("").rootNode,
    });
  });

  return fileMap;
}

describe("PythonModuleResolver", () => {
  describe("Module Map Building", () => {
    test("should build module map for a single file", () => {
      const files = createFiles(["main.py"]);
      const resolver = new PythonModuleResolver(files, "3.13");
      const root = resolver.pythonModule;

      expect(root.name).toBe("");
      expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
      expect(root.children.size).toBe(1);

      const mainModule = root.children.get("main");
      expect(mainModule).toBeDefined();
      expect(mainModule?.name).toBe("main");
      expect(mainModule?.type).toBe(PYTHON_MODULE_TYPE);
      expect(mainModule?.path).toBe("main.py");
      expect(mainModule?.fullName).toBe("main");
      expect(mainModule?.parent).toBe(root);
    });

    test("should build module map for multiple files at root level", () => {
      const files = createFiles(["main.py", "utils.py", "config.py"]);
      const resolver = new PythonModuleResolver(files, "3.13");
      const root = resolver.pythonModule;

      expect(root.children.size).toBe(3);

      const moduleNames = Array.from(root.children.keys());
      expect(moduleNames).toContain("main");
      expect(moduleNames).toContain("utils");
      expect(moduleNames).toContain("config");

      // Check each module has correct properties
      for (const name of moduleNames) {
        const module = root.children.get(name);
        expect(module?.name).toBe(name);
        expect(module?.type).toBe(PYTHON_MODULE_TYPE);
        expect(module?.path).toBe(`${name}.py`);
        expect(module?.fullName).toBe(name);
      }
    });

    test("should build module map for a simple package", () => {
      const files = createFiles(["pkg/__init__.py", "pkg/module.py"]);

      const resolver = new PythonModuleResolver(files, "3.13");
      const root = resolver.pythonModule;

      expect(root.children.size).toBe(1);

      const pkgModule = root.children.get("pkg");
      expect(pkgModule).toBeDefined();
      expect(pkgModule?.name).toBe("pkg");
      expect(pkgModule?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      expect(pkgModule?.path).toBe("pkg/__init__.py");
      expect(pkgModule?.fullName).toBe("pkg");

      expect(pkgModule?.children.size).toBe(1);
      const subModule = pkgModule?.children.get("module");
      expect(subModule?.name).toBe("module");
      expect(subModule?.type).toBe(PYTHON_MODULE_TYPE);
      expect(subModule?.path).toBe("pkg/module.py");
      expect(subModule?.fullName).toBe("pkg.module");
      expect(subModule?.parent).toBe(pkgModule);
    });

    test("should build module map for nested packages", () => {
      const files = createFiles([
        "pkg/__init__.py",
        "pkg/module.py",
        "pkg/subpkg/__init__.py",
        "pkg/subpkg/submodule.py",
        "pkg/subpkg/deeper/__init__.py",
        "pkg/subpkg/deeper/core.py",
      ]);

      const resolver = new PythonModuleResolver(files, "3.13");
      const root = resolver.pythonModule;

      // Check first level
      const pkgModule = root.children.get("pkg");
      expect(pkgModule).toBeDefined();
      expect(pkgModule?.name).toBe("pkg");
      expect(pkgModule?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);

      // Check second level
      expect(pkgModule?.children.size).toBe(2); // module.py and subpkg
      const moduleModule = pkgModule?.children.get("module");
      expect(moduleModule?.name).toBe("module");
      expect(moduleModule?.fullName).toBe("pkg.module");

      const subpkgModule = pkgModule?.children.get("subpkg");
      expect(subpkgModule?.name).toBe("subpkg");
      expect(subpkgModule?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      expect(subpkgModule?.fullName).toBe("pkg.subpkg");

      // Check third level
      expect(subpkgModule?.children.size).toBe(2); // submodule.py and deeper
      const submoduleModule = subpkgModule?.children.get("submodule");
      expect(submoduleModule?.name).toBe("submodule");
      expect(submoduleModule?.fullName).toBe("pkg.subpkg.submodule");

      const deeperModule = subpkgModule?.children.get("deeper");
      expect(deeperModule?.name).toBe("deeper");
      expect(deeperModule?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      expect(deeperModule?.fullName).toBe("pkg.subpkg.deeper");

      // Check fourth level
      const coreModule = deeperModule?.children.get("core");
      expect(coreModule?.name).toBe("core");
      expect(coreModule?.fullName).toBe("pkg.subpkg.deeper.core");
    });

    test("should handle package namespaces with multiple modules", () => {
      const files = createFiles([
        "pkg/__init__.py",
        "pkg/module1.py",
        "pkg/module2.py",
        "pkg/module3.py",
      ]);

      const resolver = new PythonModuleResolver(files, "3.13");
      const pkgModule = resolver.pythonModule.children.get("pkg");

      expect(pkgModule?.children.size).toBe(3);
      const moduleNames = Array.from(pkgModule?.children.keys() || []);
      expect(moduleNames).toContain("module1");
      expect(moduleNames).toContain("module2");
      expect(moduleNames).toContain("module3");
    });

    test("should handle multiple packages at root level", () => {
      const files = createFiles([
        "pkg1/__init__.py",
        "pkg1/module.py",
        "pkg2/__init__.py",
        "pkg2/module.py",
        "main.py",
      ]);

      const resolver = new PythonModuleResolver(files, "3.13");
      const root = resolver.pythonModule;

      expect(root.children.size).toBe(3); // pkg1, pkg2, main

      const pkg1 = root.children.get("pkg1");
      const pkg2 = root.children.get("pkg2");
      const main = root.children.get("main");

      expect(pkg1?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      expect(pkg2?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      expect(main?.type).toBe(PYTHON_MODULE_TYPE);

      expect(pkg1?.children.size).toBe(1);
      expect(pkg2?.children.size).toBe(1);
    });
  });

  describe("Module Resolution", () => {
    let resolver: PythonModuleResolver;

    beforeEach(() => {
      // Set up a comprehensive project structure for testing all resolution scenarios
      const files = createFiles([
        "main.py",
        "utils.py",
        "config.py",
        "pkg/__init__.py",
        "pkg/module1.py",
        "pkg/module2.py",
        "pkg/subpkg/__init__.py",
        "pkg/subpkg/submodule1.py",
        "pkg/subpkg/submodule2.py",
        "pkg/subpkg/deeper/__init__.py",
        "pkg/subpkg/deeper/core.py",
        "anotherpkg/__init__.py",
        "anotherpkg/helper.py",
      ]);

      resolver = new PythonModuleResolver(files, "3.13");
    });

    describe("getModuleFromFilePath", () => {
      test("should resolve module from file path for regular modules", () => {
        const mainModule = resolver.getModuleFromFilePath("main.py");
        expect(mainModule.name).toBe("main");
        expect(mainModule.fullName).toBe("main");

        const utilsModule = resolver.getModuleFromFilePath("utils.py");
        expect(utilsModule.name).toBe("utils");
        expect(utilsModule.fullName).toBe("utils");
      });

      test("should resolve module from file path for packages", () => {
        const pkgModule = resolver.getModuleFromFilePath("pkg/__init__.py");
        expect(pkgModule.name).toBe("pkg");
        expect(pkgModule.fullName).toBe("pkg");
        expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      });

      test("should handle package path without __init__.py", () => {
        const pkgModule = resolver.getModuleFromFilePath("pkg");
        expect(pkgModule.name).toBe("pkg");
        expect(pkgModule.fullName).toBe("pkg");
      });

      test("should handle package path with trailing separator", () => {
        const pkgModule = resolver.getModuleFromFilePath(`pkg${sep}`);
        expect(pkgModule.name).toBe("pkg");
        expect(pkgModule.fullName).toBe("pkg");
      });

      test("should resolve module from file path for nested packages", () => {
        const subpkgModule = resolver.getModuleFromFilePath(
          "pkg/subpkg/__init__.py",
        );
        expect(subpkgModule.name).toBe("subpkg");
        expect(subpkgModule.fullName).toBe("pkg.subpkg");
        expect(subpkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);

        const deeperModule = resolver.getModuleFromFilePath(
          "pkg/subpkg/deeper/__init__.py",
        );
        expect(deeperModule.name).toBe("deeper");
        expect(deeperModule.fullName).toBe("pkg.subpkg.deeper");
      });

      test("should resolve module from file path for modules in packages", () => {
        const moduleModule = resolver.getModuleFromFilePath("pkg/module1.py");
        expect(moduleModule.name).toBe("module1");
        expect(moduleModule.fullName).toBe("pkg.module1");

        const submoduleModule = resolver.getModuleFromFilePath(
          "pkg/subpkg/submodule1.py",
        );
        expect(submoduleModule.name).toBe("submodule1");
        expect(submoduleModule.fullName).toBe("pkg.subpkg.submodule1");

        const coreModule = resolver.getModuleFromFilePath(
          "pkg/subpkg/deeper/core.py",
        );
        expect(coreModule.name).toBe("core");
        expect(coreModule.fullName).toBe("pkg.subpkg.deeper.core");
      });

      test("should handle module path without .py extension", () => {
        const moduleModule = resolver.getModuleFromFilePath("pkg/module1");
        expect(moduleModule.name).toBe("module1");
        expect(moduleModule.fullName).toBe("pkg.module1");
      });

      test("should throw an error for non-existent modules", () => {
        expect(() => {
          resolver.getModuleFromFilePath("nonexistent.py");
        }).toThrow();

        expect(() => {
          resolver.getModuleFromFilePath("pkg/nonexistent.py");
        }).toThrow();
      });

      test("should use cache for repeat lookups", () => {
        // First lookup should cache the result
        const moduleFirst = resolver.getModuleFromFilePath("pkg/module1.py");
        expect(moduleFirst.name).toBe("module1");

        // Spy on the error throwing to ensure cache is used and we don't
        // go through the resolution logic again
        const mockThrow = vi.spyOn(global, "Error");

        // Second lookup should use the cache
        const moduleSecond = resolver.getModuleFromFilePath("pkg/module1.py");
        expect(moduleSecond).toBe(moduleFirst); // Same instance
        expect(mockThrow).not.toHaveBeenCalled();

        mockThrow.mockRestore();
      });
    });

    describe("Absolute Import Resolution", () => {
      test("should resolve top-level module imports", () => {
        // From main.py, import utils
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedUtils = resolver.resolveModule(mainModule, "utils");

        expect(resolvedUtils).toBeDefined();
        expect(resolvedUtils?.name).toBe("utils");
        expect(resolvedUtils?.fullName).toBe("utils");
      });

      test("should resolve package imports", () => {
        // From main.py, import pkg
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedPkg = resolver.resolveModule(mainModule, "pkg");

        expect(resolvedPkg).toBeDefined();
        expect(resolvedPkg?.name).toBe("pkg");
        expect(resolvedPkg?.fullName).toBe("pkg");
        expect(resolvedPkg?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
      });

      test("should resolve submodule imports with dotted names", () => {
        // From main.py, import pkg.module1
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedModule = resolver.resolveModule(
          mainModule,
          "pkg.module1",
        );

        expect(resolvedModule).toBeDefined();
        expect(resolvedModule?.name).toBe("module1");
        expect(resolvedModule?.fullName).toBe("pkg.module1");
      });

      test("should resolve deeply nested imports", () => {
        // From main.py, import pkg.subpkg.deeper.core
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedCore = resolver.resolveModule(
          mainModule,
          "pkg.subpkg.deeper.core",
        );

        expect(resolvedCore).toBeDefined();
        expect(resolvedCore?.name).toBe("core");
        expect(resolvedCore?.fullName).toBe("pkg.subpkg.deeper.core");
      });

      test("should resolve imports from within packages", () => {
        // From pkg/module1.py, import anotherpkg.helper
        const module1 = resolver.getModuleFromFilePath("pkg/module1.py");
        const resolvedHelper = resolver.resolveModule(
          module1,
          "anotherpkg.helper",
        );

        expect(resolvedHelper).toBeDefined();
        expect(resolvedHelper?.name).toBe("helper");
        expect(resolvedHelper?.fullName).toBe("anotherpkg.helper");
      });

      test("should handle absolute imports that don't exist", () => {
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedNonExistent = resolver.resolveModule(
          mainModule,
          "nonexistent",
        );

        expect(resolvedNonExistent).toBeUndefined();

        const resolvedNestedNonExistent = resolver.resolveModule(
          mainModule,
          "pkg.nonexistent",
        );
        expect(resolvedNestedNonExistent).toBeUndefined();
      });

      test("should not resolve standard library modules", () => {
        const mainModule = resolver.getModuleFromFilePath("main.py");

        // Test with common stdlib modules
        const resolvedOs = resolver.resolveModule(mainModule, "os");
        expect(resolvedOs).toBeUndefined();

        const resolvedSys = resolver.resolveModule(mainModule, "sys");
        expect(resolvedSys).toBeUndefined();

        const resolvedJson = resolver.resolveModule(mainModule, "json");
        expect(resolvedJson).toBeUndefined();
      });

      test("should handle circular imports", () => {
        // From main.py, import main (itself)
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedSelf = resolver.resolveModule(mainModule, "main");

        // Self-imports should return undefined to avoid circular references
        expect(resolvedSelf).toBeUndefined();
      });

      test("should use cache for repeated resolution", () => {
        const mainModule = resolver.getModuleFromFilePath("main.py");

        // First resolution
        const utils1 = resolver.resolveModule(mainModule, "utils");
        expect(utils1).toBeDefined();

        // Create a spy to verify cache usage
        const spy = vi.spyOn(resolver as never, "resolveAbsoluteImport");

        // Second resolution of the same import should use cache
        const utils2 = resolver.resolveModule(mainModule, "utils");
        expect(utils2).toBe(utils1); // Same instance
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
      });
    });

    describe("Relative Import Resolution", () => {
      test("should resolve same-level relative imports", () => {
        // From pkg/module1.py, import .module2
        const module1 = resolver.getModuleFromFilePath("pkg/module1.py");
        const resolvedModule2 = resolver.resolveModule(module1, ".module2");

        expect(resolvedModule2).toBeDefined();
        expect(resolvedModule2?.name).toBe("module2");
        expect(resolvedModule2?.fullName).toBe("pkg.module2");
      });

      test("should resolve parent-level relative imports", () => {
        // From pkg/subpkg/submodule1.py, import ..module1
        const submodule1 = resolver.getModuleFromFilePath(
          "pkg/subpkg/submodule1.py",
        );
        const resolvedModule1 = resolver.resolveModule(submodule1, "..module1");

        expect(resolvedModule1).toBeDefined();
        expect(resolvedModule1?.name).toBe("module1");
        expect(resolvedModule1?.fullName).toBe("pkg.module1");
      });

      test("should resolve multiple-level parent relative imports", () => {
        // From pkg/subpkg/deeper/core.py, import ...module1
        const core = resolver.getModuleFromFilePath(
          "pkg/subpkg/deeper/core.py",
        );
        const resolvedModule1 = resolver.resolveModule(core, "...module1");

        expect(resolvedModule1).toBeDefined();
        expect(resolvedModule1?.name).toBe("module1");
        expect(resolvedModule1?.fullName).toBe("pkg.module1");
      });

      test("should resolve relative imports to the root level", () => {
        // From pkg/subpkg/deeper/core.py, import ....utils
        const core = resolver.getModuleFromFilePath(
          "pkg/subpkg/deeper/core.py",
        );
        const resolvedUtils = resolver.resolveModule(core, "....utils");

        expect(resolvedUtils).toBeDefined();
        expect(resolvedUtils?.name).toBe("utils");
        expect(resolvedUtils?.fullName).toBe("utils");
      });

      test("should resolve relative imports with subpaths", () => {
        // From pkg/module1.py, import .subpkg.submodule1
        const module1 = resolver.getModuleFromFilePath("pkg/module1.py");
        const resolvedSubmodule = resolver.resolveModule(
          module1,
          ".subpkg.submodule1",
        );

        expect(resolvedSubmodule).toBeDefined();
        expect(resolvedSubmodule?.name).toBe("submodule1");
        expect(resolvedSubmodule?.fullName).toBe("pkg.subpkg.submodule1");
      });

      test("should handle relative imports to non-existent modules", () => {
        const module1 = resolver.getModuleFromFilePath("pkg/module1.py");
        const resolvedNonExistent = resolver.resolveModule(
          module1,
          ".nonexistent",
        );

        expect(resolvedNonExistent).toBeUndefined();
      });

      test("should handle too many dots in relative imports", () => {
        // If we go beyond the root level with too many dots
        const module1 = resolver.getModuleFromFilePath("pkg/module1.py");
        const resolvedTooManyDots = resolver.resolveModule(
          module1,
          "....toomany",
        );

        expect(resolvedTooManyDots).toBeUndefined();
      });

      test("should handle empty remainder in relative imports", () => {
        // Just dots means import the package itself at that level
        // From pkg/subpkg/submodule1.py, import ..
        const submodule1 = resolver.getModuleFromFilePath(
          "pkg/subpkg/submodule1.py",
        );
        const resolvedParentPackage = resolver.resolveModule(submodule1, "..");

        expect(resolvedParentPackage).toBeDefined();
        expect(resolvedParentPackage?.name).toBe("pkg");
        expect(resolvedParentPackage?.fullName).toBe("pkg");
      });

      test("should use cache for repeated relative imports", () => {
        const submodule1 = resolver.getModuleFromFilePath(
          "pkg/subpkg/submodule1.py",
        );

        // First resolution
        const module1 = resolver.resolveModule(submodule1, "..module1");
        expect(module1).toBeDefined();

        // Create a spy to verify cache usage
        const spy = vi.spyOn(resolver as never, "resolveRelativeModule");

        // Second resolution should use cache
        const module1Again = resolver.resolveModule(submodule1, "..module1");
        expect(module1Again).toBe(module1); // Same instance
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
      });
    });

    describe("Edge Cases and Special Scenarios", () => {
      test("should not allow circular references", () => {
        // Test various patterns that could create circular references
        const mainModule = resolver.getModuleFromFilePath("main.py");
        expect(resolver.resolveModule(mainModule, "main")).toBeUndefined();

        const pkgInit = resolver.getModuleFromFilePath("pkg/__init__.py");
        expect(resolver.resolveModule(pkgInit, "pkg")).toBeUndefined();

        const submodule = resolver.getModuleFromFilePath(
          "pkg/subpkg/submodule1.py",
        );
        expect(
          resolver.resolveModule(submodule, "..subpkg.submodule1"),
        ).toBeUndefined();
      });

      test("should handle mixed path separators", () => {
        // Test with a mix of forward and backward slashes
        const mixedPath = "pkg/subpkg\\submodule1.py".replace(/\\/g, sep);
        const module = resolver.getModuleFromFilePath(mixedPath);
        expect(module.name).toBe("submodule1");
        expect(module.fullName).toBe("pkg.subpkg.submodule1");
      });

      test("should resolve imports when importing a package", () => {
        // From main.py, import pkg.subpkg
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const subpkg = resolver.resolveModule(mainModule, "pkg.subpkg");

        expect(subpkg).toBeDefined();
        expect(subpkg?.name).toBe("subpkg");
        expect(subpkg?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
        expect(subpkg?.fullName).toBe("pkg.subpkg");
      });

      test("should handle namespace packages (PEP 420)", () => {
        // Python 3.3+ allows namespace packages without __init__.py
        const files = createFiles([
          "main.py",
          "namespace/pkg/module.py",
          // No __init__.py in namespace/pkg
        ]);

        const resolver = new PythonModuleResolver(files, "3.13");

        // Should create implicit namespace package
        const root = resolver.pythonModule;
        const namespaceModule = root.children.get("namespace");
        expect(namespaceModule).toBeDefined();
        expect(namespaceModule?.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);

        const pkgModule = namespaceModule?.children.get("pkg");
        expect(pkgModule).toBeDefined();
        expect(pkgModule?.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);

        // Should be able to resolve the module
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedModule = resolver.resolveModule(
          mainModule,
          "namespace.pkg.module",
        );
        expect(resolvedModule).toBeDefined();
        expect(resolvedModule?.name).toBe("module");
        expect(resolvedModule?.fullName).toBe("namespace.pkg.module");
      });

      test("should handle special file names", () => {
        // Files with names matching keywords or special patterns
        const files = createFiles([
          "main.py",
          "special/class.py",
          "special/_private.py",
          "special/with.py",
        ]);

        const resolver = new PythonModuleResolver(files, "3.13");

        // These names are valid Python module names despite being keywords
        const classModule = resolver.getModuleFromFilePath("special/class.py");
        expect(classModule.name).toBe("class");

        const privateModule = resolver.getModuleFromFilePath(
          "special/_private.py",
        );
        expect(privateModule.name).toBe("_private");

        // Import paths should resolve
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedClass = resolver.resolveModule(
          mainModule,
          "special.class",
        );
        expect(resolvedClass).toBeDefined();
        expect(resolvedClass?.name).toBe("class");

        const resolvedPrivate = resolver.resolveModule(
          mainModule,
          "special._private",
        );
        expect(resolvedPrivate).toBeDefined();
        expect(resolvedPrivate?.name).toBe("_private");
      });

      test("should handle importing from deeply nested paths", () => {
        // Tests the from X.Y.Z import A syntax equivalent
        const files = createFiles([
          "main.py",
          "deep/a/__init__.py",
          "deep/a/b/__init__.py",
          "deep/a/b/c/__init__.py",
          "deep/a/b/c/d.py",
        ]);

        const resolver = new PythonModuleResolver(files, "3.13");
        const mainModule = resolver.getModuleFromFilePath("main.py");

        // Test importing d from deep.a.b.c
        const resolvedD = resolver.resolveModule(mainModule, "deep.a.b.c.d");
        expect(resolvedD).toBeDefined();
        expect(resolvedD?.name).toBe("d");
        expect(resolvedD?.fullName).toBe("deep.a.b.c.d");

        // Test importing the package itself
        const resolvedC = resolver.resolveModule(mainModule, "deep.a.b.c");
        expect(resolvedC).toBeDefined();
        expect(resolvedC?.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
        expect(resolvedC?.fullName).toBe("deep.a.b.c");
      });

      test("should handle imports with ..* patterns", () => {
        // Create files
        const files = createFiles([
          "patterns/a/__init__.py",
          "patterns/a/b/__init__.py",
          "patterns/a/b/module.py",
          "patterns/a/other.py",
        ]);

        const resolver = new PythonModuleResolver(files, "3.13");

        // Get the module point of view
        const moduleFile = resolver.getModuleFromFilePath(
          "patterns/a/b/module.py",
        );

        // Test relative import with dots followed by wildcard-like name
        // In Python, 'from .. import *' would import everything from parent
        // Here we're testing "..other" - the parent's "other" module
        const resolvedOther = resolver.resolveModule(moduleFile, "..other");
        expect(resolvedOther).toBeDefined();
        expect(resolvedOther?.name).toBe("other");
        expect(resolvedOther?.fullName).toBe("patterns.a.other");
      });

      test("should handle resolution of _name modules", () => {
        // Modules starting with underscore are treated as internal/private
        const files = createFiles([
          "main.py",
          "pkg/__init__.py",
          "pkg/_internal.py",
          "pkg/public.py",
        ]);

        const resolver = new PythonModuleResolver(files, "3.13");

        // Get the internal module
        const internalModule =
          resolver.getModuleFromFilePath("pkg/_internal.py");
        expect(internalModule.name).toBe("_internal");

        // Should be able to resolve _name from outside
        const mainModule = resolver.getModuleFromFilePath("main.py");
        const resolvedInternal = resolver.resolveModule(
          mainModule,
          "pkg._internal",
        );
        expect(resolvedInternal).toBeDefined();
        expect(resolvedInternal?.name).toBe("_internal");
      });
    });
  });
});
