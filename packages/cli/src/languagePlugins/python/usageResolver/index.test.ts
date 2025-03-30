import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";
import { PythonUsageResolver } from "../usageResolver";

let resolver: PythonUsageResolver;
let moduleMapper: PythonModuleResolver;
let exportExtractor: PythonExportExtractor;
let importExtractor: PythonImportExtractor;
let itemResolver: PythonItemResolver;
let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

beforeEach(() => {
  // Initial basic files
  files = new Map([
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
    [
      "testModule.py",
      {
        path: "testModule.py",
        rootNode: pythonParser.parse(`
          from moduleA import foo
          import moduleB
          foo()
          moduleB.bar()
          import external_module
          external_module.some_function()
        `).rootNode,
      },
    ],
  ]);

  // Initialize the basic resolvers
  exportExtractor = new PythonExportExtractor(pythonParser, files);
  importExtractor = new PythonImportExtractor(pythonParser, files);
  moduleMapper = new PythonModuleResolver(files);
  itemResolver = new PythonItemResolver(
    exportExtractor,
    importExtractor,
    moduleMapper,
  );

  resolver = new PythonUsageResolver(
    pythonParser,
    importExtractor,
    moduleMapper,
    itemResolver,
    exportExtractor,
  );
});

describe("PythonUsageResolver", () => {
  test("correctly resolves internal usage", () => {
    const rootNode = files.get("testModule.py")?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("testModule.py", rootNode);
    const internal = combined.internal;

    // Expect 2 internal modules to be recorded.
    expect(internal.size).toBe(2);

    const moduleAResult = internal.get("moduleA.py");
    expect(moduleAResult).toBeDefined();
    expect(moduleAResult?.symbols?.map((s) => s.id)).toContain("foo");

    const moduleBResult = internal.get("moduleB.py");
    expect(moduleBResult).toBeDefined();
    // moduleB is used via attribute access (moduleB.bar()) so no specific symbols recorded.
    expect(moduleBResult?.symbols).toBeUndefined();
  });

  test("correctly resolves external usage", () => {
    const rootNode = files.get("testModule.py")?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("testModule.py", rootNode);
    const external = combined.external;

    expect(external.length).toBe(1);
    expect(external[0].moduleName).toBe("external_module");
    expect(external[0].symbolNames).toBeUndefined();
  });

  test("handles no usage gracefully", () => {
    files.set("unusedImport.py", {
      path: "unusedImport.py",
      rootNode: pythonParser.parse(`
        from moduleA import bar
        import moduleB
        import external_unused
      `).rootNode,
    });

    const rootNode = files.get("unusedImport.py")
      ?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("unusedImport.py", rootNode);

    expect(combined.internal.size).toBe(0);
    expect(combined.external.length).toBe(0);
  });
});

describe("PythonUsageResolver - Complex Cases", () => {
  beforeEach(() => {
    // Extend the files map with additional test cases

    // Wildcard import: import all symbols from moduleA and use them
    files.set("wildcardImport.py", {
      path: "wildcardImport.py",
      rootNode: pythonParser.parse(`
        from moduleA import *
        foo()
        bar()
      `).rootNode,
    });

    // Alias import: import foo with an alias and then use the alias
    files.set("aliasTest.py", {
      path: "aliasTest.py",
      rootNode: pythonParser.parse(`
        from moduleA import foo as aliasFoo
        aliasFoo()
      `).rootNode,
    });

    // Complex multi-import: explicit multiple symbols and module-level import with aliasing
    files.set("complexTest.py", {
      path: "complexTest.py",
      rootNode: pythonParser.parse(`
        from moduleA import foo, bar
        import moduleB as modB
        foo()
        bar()
        modB.bar()
      `).rootNode,
    });

    // External module usage with alias: import an external module with alias and use it
    files.set("externalAliasTest.py", {
      path: "externalAliasTest.py",
      rootNode: pythonParser.parse(`
        import external_module as extMod
        extMod.some_function()
      `).rootNode,
    });

    // --- New Complicated Cases ---

    // Deep module defining nested symbols.
    files.set("moduleDeep.py", {
      path: "moduleDeep.py",
      rootNode: pythonParser.parse(`
        def deep_func(): pass
        def deep_helper(): pass
      `).rootNode,
    });

    // Reexport module: reexports symbols from moduleDeep with an alias.
    files.set("moduleReexport.py", {
      path: "moduleReexport.py",
      rootNode: pythonParser.parse(`
        from moduleDeep import deep_func as reexported_func, deep_helper
      `).rootNode,
    });

    // Alias module: reexports a symbol from moduleReexport under a different alias.
    files.set("moduleAlias.py", {
      path: "moduleAlias.py",
      rootNode: pythonParser.parse(`
        from moduleReexport import reexported_func as alias_func
      `).rootNode,
    });

    // Complex nested file: uses nested reexports from moduleAlias and moduleReexport.
    files.set("complexNested.py", {
      path: "complexNested.py",
      rootNode: pythonParser.parse(`
        from moduleAlias import alias_func
        from moduleReexport import deep_helper as helper_alias
        alias_func()
        helper_alias()
      `).rootNode,
    });

    // Wildcard nested file: wildcard import directly from moduleDeep.
    files.set("wildcardNested.py", {
      path: "wildcardNested.py",
      rootNode: pythonParser.parse(`
        from moduleDeep import *
        deep_func()
        deep_helper()
      `).rootNode,
    });

    // Nested package: packageX reexports a symbol from its submodule.
    files.set("packageX/__init__.py", {
      path: "packageX/__init__.py",
      rootNode: pythonParser.parse(`
        from .submodule import some_func
      `).rootNode,
    });
    files.set("packageX/submodule.py", {
      path: "packageX/submodule.py",
      rootNode: pythonParser.parse(`
        def some_func(): pass
      `).rootNode,
    });
    // File that uses wildcard import from packageX.
    files.set("usePackageX.py", {
      path: "usePackageX.py",
      rootNode: pythonParser.parse(`
        from packageX import *
        some_func()
      `).rootNode,
    });

    // Reinitialize the resolvers so that they include the new files.
    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleMapper = new PythonModuleResolver(files);
    itemResolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleMapper,
    );

    resolver = new PythonUsageResolver(
      pythonParser,
      importExtractor,
      moduleMapper,
      itemResolver,
      exportExtractor,
    );
  });

  test("resolves wildcard imports correctly", () => {
    const rootNode = files.get("wildcardImport.py")
      ?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("wildcardImport.py", rootNode);
    const internal = combined.internal;

    const moduleAResult = internal.get("moduleA.py");
    expect(moduleAResult).toBeDefined();

    // Expect that both 'foo' and 'bar' are detected from the wildcard import.
    const symbolIds = moduleAResult?.symbols?.map((s) => s.id) || [];
    expect(symbolIds).toContain("foo");
    expect(symbolIds).toContain("bar");
  });

  test("resolves alias imports correctly", () => {
    const rootNode = files.get("aliasTest.py")?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("aliasTest.py", rootNode);
    const internal = combined.internal;

    const moduleAResult = internal.get("moduleA.py");
    expect(moduleAResult).toBeDefined();
    const symbolIds = moduleAResult?.symbols?.map((s) => s.id) || [];
    // Even though an alias is used, the underlying symbol is still 'foo'
    expect(symbolIds).toContain("foo");
  });

  test("resolves complex multi-import usage correctly", () => {
    const rootNode = files.get("complexTest.py")?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("complexTest.py", rootNode);
    const internal = combined.internal;

    // For moduleA, expect both 'foo' and 'bar' to be used.
    const moduleAResult = internal.get("moduleA.py");
    expect(moduleAResult).toBeDefined();
    const moduleASymbols = moduleAResult?.symbols?.map((s) => s.id) || [];
    expect(moduleASymbols).toContain("foo");
    expect(moduleASymbols).toContain("bar");

    // For moduleB, since it's used as a whole (via alias 'modB' and attribute access),
    // no specific symbols are recorded.
    const moduleBResult = internal.get("moduleB.py");
    expect(moduleBResult).toBeDefined();
    expect(moduleBResult?.symbols).toBeUndefined();
  });

  test("resolves external module usage with alias correctly", () => {
    const rootNode = files.get("externalAliasTest.py")
      ?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("externalAliasTest.py", rootNode);
    const external = combined.external;

    // External module should be recorded.
    expect(external.length).toBe(1);
    expect(external[0].moduleName).toBe("external_module");
    expect(external[0].symbolNames).toBeUndefined();
  });

  test("resolves nested reexports with aliases correctly", () => {
    const rootNode = files.get("complexNested.py")
      ?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("complexNested.py", rootNode);
    const internal = combined.internal;

    // The reexport chain should resolve to the underlying moduleDeep.py.
    const moduleDeepResult = internal.get("moduleDeep.py");
    expect(moduleDeepResult).toBeDefined();
    const symbols = moduleDeepResult?.symbols?.map((s) => s.id) || [];
    // Expect that the symbol originally defined as deep_func and deep_helper are used.
    expect(symbols).toContain("deep_func");
    expect(symbols).toContain("deep_helper");
  });

  test("resolves wildcard nested imports correctly", () => {
    const rootNode = files.get("wildcardNested.py")
      ?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("wildcardNested.py", rootNode);
    const internal = combined.internal;

    const moduleDeepResult = internal.get("moduleDeep.py");
    expect(moduleDeepResult).toBeDefined();
    const symbols = moduleDeepResult?.symbols?.map((s) => s.id) || [];
    expect(symbols).toContain("deep_func");
    expect(symbols).toContain("deep_helper");
  });

  test("resolves nested package wildcard imports correctly", () => {
    const rootNode = files.get("usePackageX.py")?.rootNode as Parser.SyntaxNode;
    const combined = resolver.resolveUsage("usePackageX.py", rootNode);
    const internal = combined.internal;

    // packageX reexports some_func from its submodule.
    // We expect the underlying module to be packageX/submodule.py.
    const packageXResult = internal.get("packageX/submodule.py");
    expect(packageXResult).toBeDefined();
    const symbols = packageXResult?.symbols?.map((s) => s.id) || [];
    expect(symbols).toContain("some_func");
  });
});
