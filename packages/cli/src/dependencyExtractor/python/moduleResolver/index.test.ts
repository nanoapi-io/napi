import { describe, test, expect, beforeEach } from "vitest";
import { PythonModuleResolver } from ".";

describe("PythonModuleResolver", () => {
  let resolver: PythonModuleResolver;

  beforeEach(() => {
    // Simulating a **complex** Python project file structure
    const fileSet = new Set([
      "project/main.py",
      "project/config.py",

      // 📂 app/
      "project/app/__init__.py",
      "project/app/utils.py",
      "project/app/utils/__init__.py",
      "project/app/utils/helpers.py",
      "project/app/utils/db/__init__.py",
      "project/app/utils/db/connector.py",
      "project/app/utils/db/queries.py",
      "project/app/utils/db/drivers/mysql.py",

      // 📂 app/services/
      "project/app/services/__init__.py",
      "project/app/services/handlers.py",
      "project/app/services/notifications.py",
      "project/app/services/analytics/__init__.py",
      "project/app/services/analytics/tracking.py",
      "project/app/services/analytics/reports.py",

      // 📂 app/user/
      "project/app/user/__init__.py",
      "project/app/user/models.py",
      "project/app/user/views.py",
      "project/app/user/controllers.py",

      // 📂 shared/
      "project/shared/__init__.py",
      "project/shared/logger.py",
      "project/shared/constants.py",

      // 📂 utils/
      "project/utils/__init__.py",
      "project/utils/module.py",
      "project/utils/formatters.py",
      "project/utils/validators.py",

      // 📂 lib/
      "project/lib/__init__.py",
      "project/lib/core/__init__.py",
      "project/lib/core/processor.py",
      "project/lib/core/helpers.py",
      "project/lib/core/submodules/__init__.py",
      "project/lib/core/submodules/encryption.py",
      "project/lib/core/submodules/compression.py",

      // 📂 circular imports
      "project/circular/__init__.py",
      "project/circular/a.py",
      "project/circular/b.py",

      // 📂 deeply nested
      "project/deeply/nested/__init__.py",
      "project/deeply/nested/feature/__init__.py",
      "project/deeply/nested/feature/main.py",
      "project/deeply/nested/feature/helpers.py",
    ]);

    resolver = new PythonModuleResolver(fileSet);
  });

  // ✅ Basic absolute imports
  test("should resolve deeply nested absolute imports", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/main.py",
        "app.utils.db.queries",
      ),
    ).toBe("project/app/utils/db/queries.py");

    expect(
      resolver.getFilePathFromModuleName(
        "project/main.py",
        "lib.core.submodules.encryption",
      ),
    ).toBe("project/lib/core/submodules/encryption.py");
  });

  // ✅ Relative imports moving up multiple levels
  test("should resolve relative imports across multiple levels", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/app/services/analytics/tracking.py",
        "..utils.db.connector",
      ),
    ).toBe("project/app/utils/db/connector.py");

    expect(
      resolver.getFilePathFromModuleName(
        "project/deeply/nested/feature/main.py",
        "....utils.formatters",
      ),
    ).toBe("project/utils/formatters.py");
  });

  // ✅ Circular imports
  test("should resolve circular dependencies correctly", () => {
    expect(
      resolver.getFilePathFromModuleName("project/circular/a.py", "circular.b"),
    ).toBe("project/circular/b.py");

    expect(
      resolver.getFilePathFromModuleName("project/circular/b.py", "circular.a"),
    ).toBe("project/circular/a.py");
  });

  // ✅ Handling missing modules (should return undefined)
  test("should return undefined for missing modules", () => {
    expect(
      resolver.getFilePathFromModuleName("project/main.py", "unknown.module"),
    ).toBeUndefined();
  });

  // ✅ Wildcard imports from `__init__.py`
  test("should resolve wildcard imports from `__init__.py`", () => {
    expect(
      resolver.getFilePathFromModuleName("project/main.py", "app.utils"),
    ).toBe("project/app/utils.py");

    expect(
      resolver.getFilePathFromModuleName("project/main.py", "app.utils.db"),
    ).toBe("project/app/utils/db/__init__.py");
  });

  // ✅ Deep relative import moving up multiple levels
  test("should resolve deep relative imports moving multiple levels up", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/app/services/analytics/reports.py",
        "...shared.constants",
      ),
    ).toBe("project/shared/constants.py");
  });

  // ✅ Sibling imports within the same subpackage
  test("should resolve sibling imports within the same subpackage", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/app/utils/db/connector.py",
        "drivers.mysql",
      ),
    ).toBe("project/app/utils/db/drivers/mysql.py");
  });

  // ✅ Module vs package resolution
  test("should resolve module over package when both exist", () => {
    expect(
      resolver.getFilePathFromModuleName("project/main.py", "app.utils"),
    ).toBe("project/app/utils.py"); // ✅ Should resolve to the module, not the package
  });

  // ✅ Resolving package to `__init__.py`
  test("should resolve package to __init__.py when importing a directory", () => {
    expect(
      resolver.getFilePathFromModuleName("project/main.py", "app.utils.db"),
    ).toBe("project/app/utils/db/__init__.py"); // ✅ Resolves correctly
  });

  // ✅ Handling invalid relative import depth
  test("should return undefined for invalid relative import exceeding project root", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/app/utils/db/queries.py",
        ".....shared.constants",
      ),
    ).toBeUndefined();
  });

  // ✅ Invalid import from a non-package directory
  test("should return undefined if trying to import from a non-package directory", () => {
    expect(
      resolver.getFilePathFromModuleName(
        "project/main.py",
        "app.utils.nonexistent",
      ),
    ).toBeUndefined();

    expect(
      resolver.getFilePathFromModuleName("project/main.py", "lib.core.invalid"),
    ).toBeUndefined();
  });

  // ✅ Caching resolved module paths
  test("should cache resolved module paths", () => {
    const filePath = "project/main.py";
    const moduleName = "app.utils";
    const cacheKey = `${filePath}|${moduleName}`;

    expect(resolver["cache"].has(cacheKey)).toBe(false); // Cache should start empty

    const firstResult = resolver.getFilePathFromModuleName(
      filePath,
      moduleName,
    );
    expect(firstResult).toBe("project/app/utils.py");

    expect(resolver["cache"].has(cacheKey)).toBe(true); // Cache should now store the result

    const secondResult = resolver.getFilePathFromModuleName(
      filePath,
      moduleName,
    );
    expect(secondResult).toBe(firstResult); // Should return the cached result
  });
});
