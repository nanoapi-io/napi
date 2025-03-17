import { describe, test, expect } from "vitest";
import {
  PythonModuleResolver,
  RESOLVED_FILE_MODULE,
  RESOLVED_PACKAGE_MODULE,
  RESOLVED_NAMESPACE_PACKAGE_MODULE,
  UNRESOLVED_MODULE,
} from "./index"; // Adjust the import path as needed

// Tests for absolute module resolution using PythonModuleResolver
describe("Absolute Module Resolution", () => {
  // ------------------------------
  // Group: No __init__.py files present
  // All folders in this project are treated as namespace packages.
  // ------------------------------
  describe("When no __init__.py files are present (namespace packages)", () => {
    const fileSet = new Set([
      "project/main.py",
      "project/utils/helper.py",
      "project/utils/stuff.py",
    ]);
    const resolver = new PythonModuleResolver(fileSet);

    test("should resolve 'project.utils' as a namespace package", () => {
      // Importing "project.utils" from "project/main.py" should resolve to the namespace package directory.
      expect(
        resolver.getResolvedModule("project/main.py", "project.utils"),
      ).toEqual({
        type: RESOLVED_NAMESPACE_PACKAGE_MODULE,
        resolvedPath: "project/utils",
      });
    });

    test("should resolve 'utils' as a namespace package", () => {
      // Importing "utils" (without the project prefix) should also resolve to the same namespace package.
      expect(resolver.getResolvedModule("project/main.py", "utils")).toEqual({
        type: RESOLVED_NAMESPACE_PACKAGE_MODULE,
        resolvedPath: "project/utils",
      });
    });

    test("should resolve file import 'project.utils.helper' to a file module", () => {
      // Importing "project.utils.helper" should locate the file "project/utils/helper.py"
      expect(
        resolver.getResolvedModule("project/main.py", "project.utils.helper"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/utils/helper.py",
      });
    });

    test("should resolve file import 'utils.helper' to a file module", () => {
      // Importing "utils.helper" (without the project prefix) should also locate the file "project/utils/helper.py"
      expect(
        resolver.getResolvedModule("project/main.py", "utils.helper"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/utils/helper.py",
      });
    });

    test("should return unresolved for 'helper' import", () => {
      // Importing "helper" by itself should remain unresolved because it doesn't map correctly in this structure.
      expect(resolver.getResolvedModule("project/main.py", "helper")).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });

    test("should return unresolved for 'stuff' import", () => {
      // Similarly, importing "stuff" should be unresolved as a standalone module.
      expect(resolver.getResolvedModule("project/main.py", "stuff")).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });
  });

  // ------------------------------
  // Group: __init__.py files present (Package resolution)
  // Folders containing __init__.py are treated as packages.
  // ------------------------------
  describe("When __init__.py files are present (package resolution)", () => {
    const fileSet = new Set([
      "project/__init__.py",
      "project/main.py",
      "project/utils/__init__.py",
      "project/utils/helper.py",
      "project/utils/stuff.py",
    ]);
    const resolver = new PythonModuleResolver(fileSet);

    test("should resolve package import 'utils' to the __init__.py file", () => {
      // Importing "utils" should resolve to the package's __init__.py file.
      expect(resolver.getResolvedModule("project/main.py", "utils")).toEqual({
        type: RESOLVED_PACKAGE_MODULE,
        resolvedPath: "project/utils/__init__.py",
      });
    });

    test("should resolve package import with project prefix 'project.utils'", () => {
      // Even when the project prefix is present, the package resolution should be the same.
      expect(
        resolver.getResolvedModule("project/main.py", "project.utils"),
      ).toEqual({
        type: RESOLVED_PACKAGE_MODULE,
        resolvedPath: "project/utils/__init__.py",
      });
    });

    test("should resolve file import 'utils.helper' correctly within a package", () => {
      // Importing a file inside a package should return the file module.
      expect(
        resolver.getResolvedModule("project/main.py", "utils.helper"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/utils/helper.py",
      });
    });
  });

  // ------------------------------
  // Group: Current file is inside a package
  // This tests that the resolver correctly computes the package base when the current file is within a package.
  // ------------------------------
  describe("When the current file is inside a package", () => {
    const fileSet = new Set([
      "project/__init__.py",
      "project/sub/__init__.py",
      "project/sub/main.py", // current file is within package "project.sub"
      "project/sub/module.py",
      "project/sub/helper.py",
    ]);
    const resolver = new PythonModuleResolver(fileSet);

    test("should resolve full package path import 'project.sub.module' to a file module", () => {
      // Importing "project.sub.module" from "project/sub/main.py" should locate "project/sub/module.py"
      expect(
        resolver.getResolvedModule("project/sub/main.py", "project.sub.module"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/sub/module.py",
      });
    });

    test("should resolve partial package path import 'sub.module' to a file module", () => {
      // Even if the import omits the top-level package, the resolver should correctly identify the module.
      expect(
        resolver.getResolvedModule("project/sub/main.py", "sub.module"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/sub/module.py",
      });
    });
  });

  // ------------------------------
  // Group: Unresolved modules
  // This group checks that invalid or non-existent modules are handled correctly.
  // ------------------------------
  describe("When importing non-existent modules", () => {
    const fileSet = new Set(["project/main.py", "project/utils/helper.py"]);
    const resolver = new PythonModuleResolver(fileSet);

    test("should return unresolved for a module that does not exist", () => {
      // Importing a module that doesn't exist should return an unresolved result.
      expect(
        resolver.getResolvedModule("project/main.py", "nonexistent"),
      ).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });

    test("should return unresolved for a nested module that does not exist", () => {
      // Importing "utils.nonexistent" where "nonexistent" is not present should also be unresolved.
      expect(
        resolver.getResolvedModule("project/main.py", "utils.nonexistent"),
      ).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });
  });

  // ------------------------------
  // Group: Caching behavior
  // Verifies that repeated lookups return the same cached result.
  // ------------------------------
  describe("Caching", () => {
    const fileSet = new Set(["project/main.py", "project/utils/helper.py"]);
    const resolver = new PythonModuleResolver(fileSet);

    test("should return the exact same object for repeated calls", () => {
      // Ensure that repeated calls with the same parameters yield the same (cached) object reference.
      const firstCall = resolver.getResolvedModule(
        "project/main.py",
        "utils.helper",
      );
      const secondCall = resolver.getResolvedModule(
        "project/main.py",
        "utils.helper",
      );
      expect(firstCall).toBe(secondCall);
    });
  });

  // ------------------------------
  // Group: Edge Cases and Priority
  // Additional tests for edge scenarios.
  // ------------------------------
  describe("Edge Cases and Priority", () => {
    test("should return unresolved when the fileSet is empty", () => {
      // With an empty fileSet, every import should be unresolved.
      const resolver = new PythonModuleResolver(new Set());
      expect(
        resolver.getResolvedModule("project/main.py", "utils.helper"),
      ).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });

    test("should return unresolved for an empty module name", () => {
      // An empty module name should result in an unresolved module.
      const fileSet = new Set(["project/main.py", "project/utils/helper.py"]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(resolver.getResolvedModule("project/main.py", "")).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });

    test("should prioritize file module over package when both exist", () => {
      // If both a file module and a package exist for the same import,
      // the resolver should return the file module.
      const fileSet = new Set([
        "project/main.py",
        "project/utils/foo.py", // File module candidate
        "project/utils/foo/__init__.py", // Package candidate (should be ignored)
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule("project/main.py", "utils.foo"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/utils/foo.py",
      });
    });

    test("should use candidate variant to remove duplicate folder segment", () => {
      // When the current file's directory has the same name as the first module part,
      // the resolver should try the parent's directory to avoid duplicating the segment.
      // For example, given a file "project/project/main.py" and an import "project.utils.foo",
      // it should resolve to "project/utils/foo.py", not "project/project/utils/foo.py".
      const fileSet = new Set([
        "project/project/main.py",
        "project/utils/foo.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule(
          "project/project/main.py",
          "project.utils.foo",
        ),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/utils/foo.py",
      });
    });

    test("should resolve a single module in the same directory", () => {
      // Given a current file in a directory, a file module in the same directory should be resolved.
      // For example, in "project/main.py" if there is also "project/foo.py", then an import of "foo" should resolve.
      const fileSet = new Set(["project/main.py", "project/foo.py"]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(resolver.getResolvedModule("project/main.py", "foo")).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/foo.py",
      });
    });

    test("should resolve a deep nested module", () => {
      // Test resolution when the module is nested several levels deep.
      // For example, "a/b/c/d.py" should be found when importing "a.b.c.d" from a file "a/main.py".
      const fileSet = new Set(["a/main.py", "a/b/c/d.py"]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(resolver.getResolvedModule("a/main.py", "a.b.c.d")).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "a/b/c/d.py",
      });
    });

    test("should resolve a nested namespace package", () => {
      // In this case, no __init__.py files exist so that subdirectories are namespace packages.
      // For instance, if "project/sub/utils/helper.py" exists but there are no __init__.py files
      // in "project/sub" or "project/sub/utils", an import "project.sub.utils" should resolve
      // to the directory "project/sub/utils" as a namespace package.
      const fileSet = new Set([
        "project/sub/main.py",
        "project/sub/utils/helper.py",
        "project/sub/utils/extra.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule("project/sub/main.py", "project.sub.utils"),
      ).toEqual({
        type: RESOLVED_NAMESPACE_PACKAGE_MODULE,
        resolvedPath: "project/sub/utils",
      });
    });

    test("should prefer the first candidate when module exists in multiple sys.path candidates", () => {
      // This test simulates a scenario where the same module is found via two different sys.path candidates.
      // We expect that the one from the first candidate in the sys.path order wins.
      // For example, assume that the current file is "project/sub/main.py" inside a package.
      // The sys.path candidates would be: the package base ("project") and the current directory ("project/sub").
      // If "project/sub/bar.py" and "project/bar.py" both exist, the resolver should pick the one found
      // in the package base candidate (if it comes first in our ordering).
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
        "project/bar.py", // Exists in package base ("project")
        "project/sub/bar.py", // Also exists in current directory ("project/sub")
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      // Our getSysPathCandidates puts the package base first (if different), so "project/bar.py" should win.
      expect(resolver.getResolvedModule("project/sub/main.py", "bar")).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/bar.py",
      });
    });
  });

  // ------------------------------
  // Group: Relative Imports
  // Tests for relative import behavior.
  // ------------------------------
  describe("Relative Imports", () => {
    test("should resolve relative import '.helper' in a package", () => {
      // From a module in a package, a relative import with one dot means the current package.
      // Given the fileSet:
      //   "project/__init__.py",
      //   "project/sub/__init__.py",
      //   "project/sub/main.py",
      //   "project/sub/helper.py",
      // then from "project/sub/main.py", importing ".helper" should resolve to "project/sub/helper.py".
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
        "project/sub/helper.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule("project/sub/main.py", ".helper"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/sub/helper.py",
      });
    });

    test("should resolve relative import '..foo' to a parent package module", () => {
      // For a module "project/sub/main.py" in a package "project.sub", a relative import "..foo"
      // should move one level up (to the parent package "project") and then append "foo".
      // Given the fileSet:
      //   "project/__init__.py",
      //   "project/main.py",
      //   "project/sub/__init__.py",
      //   "project/sub/main.py",
      //   "project/foo.py",
      // then from "project/sub/main.py", importing "..foo" should resolve to "project/foo.py".
      const fileSet = new Set([
        "project/__init__.py",
        "project/main.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
        "project/foo.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule("project/sub/main.py", "..foo"),
      ).toEqual({
        type: RESOLVED_FILE_MODULE,
        resolvedPath: "project/foo.py",
      });
    });

    test("should resolve relative import '.' to the current package", () => {
      // A relative import of "." means the current package.
      // For a file "project/sub/main.py" with package "project.sub", if "project/sub/__init__.py" exists,
      // then importing "." should resolve to "project/sub/__init__.py".
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(resolver.getResolvedModule("project/sub/main.py", ".")).toEqual({
        type: RESOLVED_PACKAGE_MODULE,
        resolvedPath: "project/sub/__init__.py",
      });
    });

    test("should resolve relative import '..' to the parent package", () => {
      // A relative import of ".." should resolve to the parent package.
      // For a file "project/sub/main.py", importing ".." should resolve to "project/__init__.py".
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(resolver.getResolvedModule("project/sub/main.py", "..")).toEqual({
        type: RESOLVED_PACKAGE_MODULE,
        resolvedPath: "project/__init__.py",
      });
    });

    test("should return unresolved for a relative import that goes too high", () => {
      // If the relative import level exceeds the package depth, it should be unresolved.
      // For a file "project/sub/main.py" (package "project.sub"), an import with three leading dots (e.g. "...foo")
      // is invalid because the package depth is only two.
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
        "project/foo.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      expect(
        resolver.getResolvedModule("project/sub/main.py", "...foo"),
      ).toEqual({
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      });
    });

    test("should cache relative imports correctly", () => {
      // Ensure that caching works for relative imports.
      const fileSet = new Set([
        "project/__init__.py",
        "project/sub/__init__.py",
        "project/sub/main.py",
        "project/sub/helper.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);
      const firstCall = resolver.getResolvedModule(
        "project/sub/main.py",
        ".helper",
      );
      const secondCall = resolver.getResolvedModule(
        "project/sub/main.py",
        ".helper",
      );
      expect(firstCall).toBe(secondCall);
    });
  });
});
