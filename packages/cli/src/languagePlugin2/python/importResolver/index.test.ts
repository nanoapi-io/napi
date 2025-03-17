import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { PythonImportResolver } from "./index";
import { PythonModuleMapper } from "../moduleMapper";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportResolver } from "../exportResolver";

// TODO redo all these test with new implementation

describe("PythonImportResolver", () => {
  let resolver: PythonImportResolver;
  let moduleMapper: PythonModuleMapper;
  let exportResolver: PythonExportResolver;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
    files = new Map([
      [
        "project/__init__.py",
        {
          path: "project/__init__.py",
          rootNode: pythonParser.parse("").rootNode,
        },
      ],
      [
        "project/app/__init__.py",
        {
          path: "project/app/__init__.py",
          rootNode: pythonParser.parse("").rootNode,
        },
      ],
      [
        "project/app/main.py",
        {
          path: "project/app/main.py",
          rootNode: pythonParser.parse(`
              import os
              import sys as system
              from app.utils import helper
              from app.services.handlers import process_request
              from app.utils import *  # wildcard import
              from app.subpackage.module import exported_func as func_alias
              from .local_module import local_func
              from ..parent_module import parent_func
            `).rootNode,
        },
      ],
      [
        "project/app/utils.py",
        {
          path: "project/app/utils.py",
          rootNode: pythonParser.parse(`
              __all__ = ["helper"]
        
              def helper():
                  pass
        
              def hidden_func():
                  pass
            `).rootNode,
        },
      ],
      [
        "project/app/services/handlers.py",
        {
          path: "project/app/services/handlers.py",
          rootNode: pythonParser.parse(`
              def process_request():
                  pass
            `).rootNode,
        },
      ],
      [
        "project/app/subpackage/__init__.py",
        {
          path: "project/app/subpackage/__init__.py",
          rootNode: pythonParser.parse("").rootNode,
        },
      ],
      [
        "project/app/subpackage/module.py",
        {
          path: "project/app/subpackage/module.py",
          rootNode: pythonParser.parse(`
              def exported_func():
                  pass
            `).rootNode,
        },
      ],
      [
        "project/app/local_module.py",
        {
          path: "project/app/local_module.py",
          rootNode: pythonParser.parse(`
              def local_func():
                  pass
            `).rootNode,
        },
      ],
      [
        "project/parent_module.py",
        {
          path: "project/parent_module.py",
          rootNode: pythonParser.parse(`
              def parent_func():
                  pass
            `).rootNode,
        },
      ],
    ]);

    exportResolver = new PythonExportResolver(pythonParser, files);
    moduleMapper = new PythonModuleMapper(files, exportResolver);
    resolver = new PythonImportResolver(
      pythonParser,
      files,
      moduleMapper,
      exportResolver,
    );
  });

  // ✅ Test standard imports (`import module`)
  test.only("should resolve standard imports", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "os",
          resolvedSource: undefined,
          alias: undefined,
          isWildcard: false,
        },
        {
          source: "sys",
          resolvedSource: undefined,
          alias: "system",
          isWildcard: false,
        },
      ]),
    );
  });

  // ✅ Test `from module import symbol`
  test("should resolve 'from module import symbol' imports", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "app.utils",
          resolvedSource: "project/app/utils.py",
          isWildcard: false,
          symbols: [{ id: "helper", alias: undefined }],
        },
        {
          source: "app.services.handlers",
          resolvedSource: "project/app/services/handlers.py",
          isWildcard: false,
          symbols: [{ id: "process_request", alias: undefined }],
        },
      ]),
    );
  });

  // ✅ Test `from module import symbol as alias`
  test("should resolve 'from module import symbol as alias' imports", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "app.subpackage.module",
          resolvedSource: "project/app/subpackage/module.py",
          isWildcard: false,
          symbols: [{ id: "exported_func", alias: "func_alias" }],
        },
      ]),
    );
  });

  // ✅ Test `from module import *`
  test("should resolve wildcard imports respecting __all__", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "app.utils",
          resolvedSource: "project/app/utils.py",
          isWildcard: true,
          symbols: [{ id: "helper", alias: undefined }], // `__all__` defines exports
        },
      ]),
    );
  });

  // ✅ Test relative imports (`from .module import X`)
  test("should resolve relative imports", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: ".local_module",
          resolvedSource: "project/app/local_module.py",
          isWildcard: false,
          symbols: [{ id: "local_func", alias: undefined }],
        },
      ]),
    );
  });

  // ✅ Test relative imports (`from ..module import X`)
  test("should resolve parent-level relative imports", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "..parent_module",
          resolvedSource: "project/parent_module.py",
          isWildcard: false,
          symbols: [{ id: "parent_func", alias: undefined }],
        },
      ]),
    );
  });

  // ✅ Test package imports (`from package import *`)
  test("should resolve package imports correctly via __init__.py", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).toEqual(
      expect.arrayContaining([
        {
          source: "app.subpackage.module",
          resolvedSource: "project/app/subpackage/module.py",
          isWildcard: false,
          symbols: [{ id: "exported_func", alias: "func_alias" }],
        },
      ]),
    );
  });

  // ✅ Test caching behavior
  test("should cache imported modules", () => {
    const filePath = "project/app/main.py";
    expect(resolver["cache"].has(filePath)).toBe(false);

    // First call - should populate the cache
    resolver.getImportStatements(filePath);
    expect(resolver["cache"].has(filePath)).toBe(true);

    // Second call - should return cached result
    const cachedResult = resolver.getImportStatements(filePath);
    expect(resolver["cache"].get(filePath)).toBe(cachedResult);
  });

  // ✅ Test edge case: importing non-existent modules
  test("should return undefined for missing modules", () => {
    const imports = resolver.getImportStatements("project/app/main.py");

    expect(imports).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "nonexistent.module" }),
      ]),
    );
  });
});
