import { describe, test, expect } from "vitest";
import { PythonModuleResolver } from ".";

describe("PythonModuleResolver", () => {
  /**
   * ------------------------------------------------------------------------
   * ABSOLUTE IMPORTS
   * ------------------------------------------------------------------------
   */
  describe("Absolute Imports", () => {
    test("should resolve a basic absolute import", () => {
      const fileSet = new Set(["project/main.py", "project/app/utils.py"]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName("project/main.py", "app.utils"),
      ).toBe("project/app/utils.py");
    });

    test("should resolve with different way of importing", () => {
      const fileSet = new Set(["api/wizard/data.py", "api/wizard/service.py"]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName(
          "api/wizard/service.py",
          "api.wizard.data",
        ),
      ).toBe("api/wizard/data.py");

      expect(
        resolver.getFilePathFromModuleName(
          "api/wizard/service.py",
          "wizard.data",
        ),
      ).toBe("api/wizard/data.py");

      expect(
        resolver.getFilePathFromModuleName("api/wizard/service.py", "data"),
      ).toBe("api/wizard/data.py");
    });

    test("should handle a missing module path", () => {
      // Another minimal set: no file for `app.fake_module`
      const fileSet = new Set(["project/main.py", "project/app/utils.py"]);
      const resolver = new PythonModuleResolver(fileSet);

      // This module doesn't exist in the fileSet
      expect(
        resolver.getFilePathFromModuleName(
          "project/main.py",
          "app.fake_module",
        ),
      ).toBeUndefined();
    });

    test("should resolve a package to __init__.py if it is a directory", () => {
      const fileSet = new Set([
        "project/main.py",
        "project/app/__init__/.py",
        "project/app/utils/__init__.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName("project/main.py", "app.utils"),
      ).toBe("project/app/utils/__init__.py");
    });

    test("should resolve a package to utils.py if both utils.py and utils/__init__.py are present", () => {
      const fileSet = new Set([
        "project/main.py",
        "project/app/__init__/.py",
        "project/app/utils/__init__.py",
        "project/app/utils.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName("project/main.py", "app.utils"),
      ).toBe("project/app/utils.py");
    });

    test("should resolve deeper nested absolute imports", () => {
      const fileSet = new Set([
        "project/main.py",
        "project/app/utils/db/__init__.py",
        "project/app/utils/db/queries.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName(
          "project/main.py",
          "app.utils.db.queries",
        ),
      ).toBe("project/app/utils/db/queries.py");
    });
  });

  /**
   * ------------------------------------------------------------------------
   * RELATIVE IMPORTS
   * ------------------------------------------------------------------------
   */
  describe("Relative Imports", () => {
    test("should resolve a simple relative import to a sibling", () => {
      // Minimal set to test moving up one folder
      const fileSet = new Set([
        "project/app/utils/helpers.py",
        "project/app/utils/service.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      // Suppose 'helpers.py' imports something from `..utils`
      expect(
        resolver.getFilePathFromModuleName(
          "project/app/utils/helpers.py",
          ".service",
        ),
      ).toBe("project/app/utils/service.py");
    });

    test("should resolve a simple relative import one level up", () => {
      // Minimal set to test moving up one folder
      const fileSet = new Set([
        "project/app/utils/helpers.py",
        "project/app/utils.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      // Suppose 'helpers.py' imports something from `..utils`
      expect(
        resolver.getFilePathFromModuleName(
          "project/app/utils/helpers.py",
          "..utils",
        ),
      ).toBe("project/app/utils.py");
    });

    test("should resolve a simple relative import two level up", () => {
      // Minimal set to test moving up one folder
      const fileSet = new Set([
        "project/app/utils/helpers/file.py",
        "project/app/utils.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      // Suppose 'helpers.py' imports something from `..utils`
      expect(
        resolver.getFilePathFromModuleName(
          "project/app/utils/helpers/file.py",
          "...utils",
        ),
      ).toBe("project/app/utils.py");
    });

    test("should resolve relative imports across multiple levels", () => {
      const fileSet = new Set([
        "project/app/services/tracking.py",
        "project/app/utils/db/connector.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      expect(
        resolver.getFilePathFromModuleName(
          "project/app/services/tracking.py",
          "..utils.db.connector",
        ),
      ).toBe("project/app/utils/db/connector.py");
    });

    test("should return undefined for invalid relative import exceeding project root", () => {
      const fileSet = new Set([
        "project/app/utils/db/queries.py",
        "project/shared/constants.py",
      ]);
      const resolver = new PythonModuleResolver(fileSet);

      // Attempt going too many levels up
      expect(
        resolver.getFilePathFromModuleName(
          "project/app/utils/db/queries.py",
          ".....shared.constants",
        ),
      ).toBeUndefined();
    });
  });

  /**
   * ------------------------------------------------------------------------
   * CACHING (OPTIONAL)
   * ------------------------------------------------------------------------
   */
  describe("Caching behavior", () => {
    test("should cache resolved module paths", () => {
      const fileSet = new Set(["project/main.py", "project/app/utils.py"]);
      const resolver = new PythonModuleResolver(fileSet);

      const filePath = "project/main.py";
      const moduleName = "app.utils";
      const cacheKey = `${filePath}|${moduleName}`;

      // Cache should start empty
      expect(resolver["cache"].has(cacheKey)).toBe(false);

      // First resolution
      const firstResult = resolver.getFilePathFromModuleName(
        filePath,
        moduleName,
      );
      expect(firstResult).toBe("project/app/utils.py");

      // After the first resolution, it should be cached
      expect(resolver["cache"].has(cacheKey)).toBe(true);

      // Second resolution is the same
      const secondResult = resolver.getFilePathFromModuleName(
        filePath,
        moduleName,
      );
      expect(secondResult).toBe(firstResult);
    });
  });
});
