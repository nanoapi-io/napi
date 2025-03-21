import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { ImportStatement, PythonImportResolver } from "./index";
import { PythonModuleMapper } from "../moduleMapper";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportResolver } from "../exportResolver";

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
      // Main file with a mix of standard and from-imports
      [
        "project/app/main.py",
        {
          path: "project/app/main.py",
          rootNode: pythonParser.parse(`
              import os
              import sys as system
              import project
              from app.utils import helper
              from app.services.handlers import process_request
              from app.utils import *  # wildcard import
              from app.subpackage.module import exported_func as func_alias
              from .local_module import local_func
              from ..parent_module import parent_func
              from app.multi import a, b, c
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
      // A file with multiple symbols in a single from-import.
      [
        "project/app/multi.py",
        {
          path: "project/app/multi.py",
          rootNode: pythonParser.parse(`
              __all__ = ["a", "b"]

              def a():
                  pass

              def b():
                  pass

              def c():
                  pass
            `).rootNode,
        },
      ],
      // A file with no import statements.
      [
        "project/app/empty.py",
        {
          path: "project/app/empty.py",
          rootNode: pythonParser.parse("").rootNode,
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

  test("should resolve standard imports", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    // Standard imports are those whose node.type is "import_statement"
    const standardImports = importStatements.filter(
      (stmt) => stmt.node.type === "import_statement",
    );

    // We expect three standard import statements:
    // "import os", "import sys as system", and "import project"
    expect(standardImports).toHaveLength(3);

    // Check "import os"
    const osImport = standardImports.find((stmt) =>
      stmt.modules.some((m) => m.source === "os"),
    ) as ImportStatement;
    expect(osImport).toBeDefined();
    expect(osImport.node.text.trim()).toBe("import os");
    expect(osImport.sourceNode).toBeUndefined();
    expect(osImport.members).toHaveLength(1);
    expect(osImport.members[0].node.text.trim()).toBe("os");
    expect(osImport.members[0].memberIdentifierNode.text.trim()).toBe("os");
    expect(osImport.members[0].memberAliasNode).toBeUndefined();
    expect(osImport.modules).toHaveLength(1);
    expect(osImport.modules[0].source).toBe("os");
    expect(osImport.modules[0].alias).toBeUndefined();
    // External modules resolve to undefined.
    expect(osImport.modules[0].module).toBeUndefined();
    expect(osImport.modules[0].symbols).toHaveLength(0);

    // Check "import sys as system"
    const sysImport = standardImports.find((stmt) =>
      stmt.modules.some((m) => m.source === "sys"),
    ) as ImportStatement;
    expect(sysImport).toBeDefined();
    expect(sysImport.node.text.trim()).toBe("import sys as system");
    expect(sysImport.sourceNode).toBeUndefined();
    expect(sysImport.members).toHaveLength(1);
    expect(sysImport.members[0].node.text.trim()).toBe("sys as system");
    expect(sysImport.members[0].memberIdentifierNode.text.trim()).toBe("sys");
    expect(sysImport.members[0].memberAliasNode?.text.trim()).toBe("system");
    expect(sysImport.modules).toHaveLength(1);
    expect(sysImport.modules[0].source).toBe("sys");
    expect(sysImport.modules[0].alias).toBe("system");
    expect(sysImport.modules[0].module).toBeUndefined();
    expect(sysImport.modules[0].symbols).toHaveLength(0);

    // Check "import project"
    const projectImport = standardImports.find((stmt) =>
      stmt.modules.some((m) => m.source === "project"),
    ) as ImportStatement;
    expect(projectImport).toBeDefined();
    expect(projectImport.node.text.trim()).toBe("import project");
    expect(projectImport.sourceNode).toBeUndefined();
    expect(projectImport.members).toHaveLength(1);
    expect(projectImport.members[0].node.text.trim()).toBe("project");
    expect(projectImport.members[0].memberIdentifierNode.text.trim()).toBe(
      "project",
    );
    expect(projectImport.members[0].memberAliasNode).toBeUndefined();
    expect(projectImport.modules).toHaveLength(1);
    expect(projectImport.modules[0].source).toBe("project");
    expect(projectImport.modules[0].alias).toBeUndefined();
    expect(projectImport.modules[0].module?.filePath).toBe(
      "project/__init__.py",
    );
    expect(projectImport.modules[0].module?.name).toBe("project");
    expect(projectImport.modules[0].module?.fullName).toBe("project");
    expect(projectImport.modules[0].module?.parent?.name).toBe("");
    expect(projectImport.modules[0].module?.children).toHaveLength(2);
    expect(projectImport.modules[0].symbols).toHaveLength(0);
  });

  test("should resolve 'from app.utils import helper'", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    const utilsImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() === "from app.utils import helper",
    ) as ImportStatement;
    expect(utilsImport).toBeDefined();
    expect(utilsImport.node.text.trim()).toBe("from app.utils import helper");
    expect(utilsImport.sourceNode?.text).toBe("app.utils");
    expect(utilsImport.members).toHaveLength(1);
    // In from-imports, the member node is the module name
    expect(utilsImport.members[0].node.text.trim()).toBe("app.utils");
    expect(utilsImport.members[0].memberIdentifierNode.text.trim()).toBe(
      "app.utils",
    );
    expect(utilsImport.members[0].memberAliasNode).toBeUndefined();
    // The memberSymbols should contain the symbol "helper"
    expect(utilsImport.members[0].memberSymbols).toHaveLength(1);
    expect(utilsImport.members[0].memberSymbols[0].node.text.trim()).toBe(
      "helper",
    );
    expect(
      utilsImport.members[0].memberSymbols[0].identifierNode.text.trim(),
    ).toBe("helper");
    expect(utilsImport.members[0].memberSymbols[0].aliasNode).toBeUndefined();
    expect(utilsImport.modules).toHaveLength(1);
    expect(utilsImport.modules[0].source).toBe("app.utils");
    expect(utilsImport.modules[0].alias).toBeUndefined();
    expect(utilsImport.modules[0].module?.filePath).toBe(
      "project/app/utils.py",
    );
    expect(utilsImport.modules[0].module?.name).toBe("utils");
    expect(utilsImport.modules[0].module?.fullName).toBe("project.app.utils");
    expect(utilsImport.modules[0].module?.parent?.name).toBe("app");
    expect(utilsImport.modules[0].module?.children).toHaveLength(0);
    expect(utilsImport.modules[0].symbols).toHaveLength(1);
    expect(utilsImport.modules[0].symbols[0].id).toBe("helper");
    expect(utilsImport.modules[0].symbols[0].alias).toBeUndefined();
    expect(utilsImport.modules[0].symbols[0].isExplicitelyImported).toBe(true);
  });

  test("should resolve 'from app.subpackage.module import exported_func as func_alias'", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    const subpackageImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() ===
          "from app.subpackage.module import exported_func as func_alias",
    ) as ImportStatement;
    expect(subpackageImport).toBeDefined();
    expect(subpackageImport.node.text.trim()).toBe(
      "from app.subpackage.module import exported_func as func_alias",
    );
    expect(subpackageImport.sourceNode?.text).toBe("app.subpackage.module");
    expect(subpackageImport.members).toHaveLength(1);
    expect(subpackageImport.members[0].node.text.trim()).toBe(
      "app.subpackage.module",
    );
    expect(subpackageImport.members[0].memberIdentifierNode.text.trim()).toBe(
      "app.subpackage.module",
    );
    expect(subpackageImport.members[0].memberAliasNode).toBeUndefined();
    expect(subpackageImport.members[0].memberSymbols).toHaveLength(1);
    expect(subpackageImport.members[0].memberSymbols[0].node.text.trim()).toBe(
      "exported_func as func_alias",
    );
    expect(
      subpackageImport.members[0].memberSymbols[0].identifierNode.text.trim(),
    ).toBe("exported_func");
    expect(
      subpackageImport.members[0].memberSymbols[0].aliasNode?.text.trim(),
    ).toBe("func_alias");
    expect(subpackageImport.modules).toHaveLength(1);
    expect(subpackageImport.modules[0].source).toBe("app.subpackage.module");
    expect(subpackageImport.modules[0].alias).toBeUndefined();
    expect(subpackageImport.modules[0].module?.filePath).toBe(
      "project/app/subpackage/module.py",
    );
    expect(subpackageImport.modules[0].module?.name).toBe("module");
    expect(subpackageImport.modules[0].module?.fullName).toBe(
      "project.app.subpackage.module",
    );
    expect(subpackageImport.modules[0].module?.parent?.name).toBe("subpackage");
    expect(subpackageImport.modules[0].module?.children).toHaveLength(0);
    expect(subpackageImport.modules[0].symbols).toHaveLength(1);
    expect(subpackageImport.modules[0].symbols[0].id).toBe("exported_func");
    expect(subpackageImport.modules[0].symbols[0].alias).toBe("func_alias");
    expect(subpackageImport.modules[0].symbols[0].isExplicitelyImported).toBe(
      true,
    );
  });

  test("should resolve wildcard import 'from app.utils import *'", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    const wildcardImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() === "from app.utils import *",
    ) as ImportStatement;
    expect(wildcardImport).toBeDefined();
    expect(wildcardImport.node.text.trim()).toBe("from app.utils import *");
    expect(wildcardImport.sourceNode?.text).toBe("app.utils");
    expect(wildcardImport.members).toHaveLength(1);
    expect(wildcardImport.members[0].node.text.trim()).toBe("app.utils");
    expect(wildcardImport.members[0].memberIdentifierNode.text.trim()).toBe(
      "app.utils",
    );
    expect(wildcardImport.members[0].memberAliasNode).toBeUndefined();
    // Wildcard import should yield no memberSymbols on the member itself.
    expect(wildcardImport.members[0].memberSymbols).toHaveLength(0);
    expect(wildcardImport.modules).toHaveLength(1);
    expect(wildcardImport.modules[0].source).toBe("app.utils");
    expect(wildcardImport.modules[0].alias).toBeUndefined();
    expect(wildcardImport.modules[0].module?.filePath).toBe(
      "project/app/utils.py",
    );
    expect(wildcardImport.modules[0].module?.name).toBe("utils");
    expect(wildcardImport.modules[0].module?.fullName).toBe(
      "project.app.utils",
    );
    expect(wildcardImport.modules[0].module?.parent?.name).toBe("app");
    expect(wildcardImport.modules[0].module?.children).toHaveLength(0);
    expect(wildcardImport.modules[0].symbols).toHaveLength(1);
    expect(wildcardImport.modules[0].symbols[0].id).toBe("helper");
    expect(wildcardImport.modules[0].symbols[0].alias).toBeUndefined();
    expect(wildcardImport.modules[0].symbols[0].isExplicitelyImported).toBe(
      false,
    );
  });

  test("should resolve relative import 'from .local_module import local_func'", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    const localImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() === "from .local_module import local_func",
    ) as ImportStatement;
    expect(localImport).toBeDefined();
    expect(localImport.node.text.trim()).toBe(
      "from .local_module import local_func",
    );
    expect(localImport.sourceNode?.text).toBe(".local_module");
    expect(localImport.members).toHaveLength(1);
    expect(localImport.members[0].node.text.trim()).toBe(".local_module");
    expect(localImport.members[0].memberIdentifierNode.text.trim()).toBe(
      ".local_module",
    );
    expect(localImport.members[0].memberAliasNode).toBeUndefined();
    expect(localImport.members[0].memberSymbols).toHaveLength(1);
    expect(localImport.members[0].memberSymbols[0].node.text.trim()).toBe(
      "local_func",
    );
    expect(
      localImport.members[0].memberSymbols[0].identifierNode.text.trim(),
    ).toBe("local_func");
    expect(localImport.members[0].memberSymbols[0].aliasNode).toBeUndefined();
    expect(localImport.modules).toHaveLength(1);
    expect(localImport.modules[0].source).toBe(".local_module");
    expect(localImport.modules[0].alias).toBeUndefined();
    expect(localImport.modules[0].module?.filePath).toBe(
      "project/app/local_module.py",
    );
    expect(localImport.modules[0].module?.name).toBe("local_module");
    expect(localImport.modules[0].module?.fullName).toBe(
      "project.app.local_module",
    );
    expect(localImport.modules[0].module?.parent?.name).toBe("app");
    expect(localImport.modules[0].module?.children).toHaveLength(0);
    expect(localImport.modules[0].symbols).toHaveLength(1);
    expect(localImport.modules[0].symbols[0].id).toBe("local_func");
    expect(localImport.modules[0].symbols[0].alias).toBeUndefined();
    expect(localImport.modules[0].symbols[0].isExplicitelyImported).toBe(true);
  });

  test("should resolve parent-level relative import 'from ..parent_module import parent_func'", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    const parentImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() === "from ..parent_module import parent_func",
    ) as ImportStatement;
    expect(parentImport).toBeDefined();
    expect(parentImport.node.text.trim()).toBe(
      "from ..parent_module import parent_func",
    );
    expect(parentImport.sourceNode?.text).toBe("..parent_module");
    expect(parentImport.members).toHaveLength(1);
    expect(parentImport.members[0].node.text.trim()).toBe("..parent_module");
    expect(parentImport.members[0].memberIdentifierNode.text.trim()).toBe(
      "..parent_module",
    );
    expect(parentImport.members[0].memberAliasNode).toBeUndefined();
    expect(parentImport.members[0].memberSymbols).toHaveLength(1);
    expect(parentImport.members[0].memberSymbols[0].node.text.trim()).toBe(
      "parent_func",
    );
    expect(
      parentImport.members[0].memberSymbols[0].identifierNode.text.trim(),
    ).toBe("parent_func");
    expect(parentImport.members[0].memberSymbols[0].aliasNode).toBeUndefined();
    expect(parentImport.modules).toHaveLength(1);
    expect(parentImport.modules[0].source).toBe("..parent_module");
    expect(parentImport.modules[0].alias).toBeUndefined();
    expect(parentImport.modules[0].module?.filePath).toBe(
      "project/parent_module.py",
    );
    expect(parentImport.modules[0].module?.name).toBe("parent_module");
    expect(parentImport.modules[0].module?.fullName).toBe(
      "project.parent_module",
    );
    expect(parentImport.modules[0].module?.parent?.name).toBe("project");
    expect(parentImport.modules[0].module?.children).toHaveLength(0);
    expect(parentImport.modules[0].symbols).toHaveLength(1);
    expect(parentImport.modules[0].symbols[0].id).toBe("parent_func");
    expect(parentImport.modules[0].symbols[0].alias).toBeUndefined();
    expect(parentImport.modules[0].symbols[0].isExplicitelyImported).toBe(true);
  });

  test("should resolve multiple symbols in a single from-import", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/main.py",
    );
    // Our main file now also contains: "from app.multi import a, b"
    const multiImport = importStatements.find(
      (stmt) =>
        stmt.node.type === "import_from_statement" &&
        stmt.node.text.trim() === "from app.multi import a, b, c",
    ) as ImportStatement;
    expect(multiImport).toBeDefined();
    expect(multiImport.node.text.trim()).toBe("from app.multi import a, b, c");
    expect(multiImport.sourceNode?.text).toBe("app.multi");
    expect(multiImport.members).toHaveLength(1);
    // In our implementation, the member node for from-import is the module name
    expect(multiImport.members[0].node.text.trim()).toBe("app.multi");
    // And memberSymbols should contain both "a" and "b"
    expect(multiImport.members[0].memberSymbols).toHaveLength(3);
    const symbols = multiImport.members[0].memberSymbols;
    expect(symbols.map((s) => s.identifierNode.text.trim())).toEqual([
      "a",
      "b",
      "c",
    ]);
    // Check that the module is resolved correctly
    expect(multiImport.modules).toHaveLength(1);
    expect(multiImport.modules[0].source).toBe("app.multi");
    expect(multiImport.modules[0].module?.filePath).toBe(
      "project/app/multi.py",
    );
    expect(multiImport.modules[0].symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "a",
          isExplicitelyImported: true,
          alias: undefined,
        }),
        expect.objectContaining({
          id: "b",
          isExplicitelyImported: true,
          alias: undefined,
        }),
        expect.objectContaining({
          id: "c",
          isExplicitelyImported: true,
          alias: undefined,
        }),
      ]),
    );
  });

  test("should return an empty array for a file with no imports", () => {
    const importStatements = resolver.getImportStatements(
      "project/app/empty.py",
    );
    expect(importStatements).toHaveLength(0);
  });

  test("should return an empty array for non-existent files", () => {
    const importStatements = resolver.getImportStatements("nonexistent.py");
    expect(importStatements).toHaveLength(0);
  });

  test("should cache results", () => {
    const filePath = "project/app/main.py";
    // First call populates the cache
    const result1 = resolver.getImportStatements(filePath);
    const result2 = resolver.getImportStatements(filePath);
    // Expect the same object reference from the cache
    expect(result2).toBe(result1);
  });
});
