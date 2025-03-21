import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { ModuleDependency, PythonDependencyResolver } from "./index";
import { PythonExportResolver } from "../exportResolver";
import { PythonImportResolver } from "../importResolver";
import { PythonUsageResolver } from "../usageResolver";
import { PythonModuleMapper } from "../moduleMapper";
import { pythonParser } from "../../../helpers/treeSitter/parsers";

const parser = pythonParser;

describe("PythonDependencyResolver", () => {
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let dependencyResolver: PythonDependencyResolver;
  let exportResolver: PythonExportResolver;
  let importResolver: PythonImportResolver;
  let usageResolver: PythonUsageResolver;
  let moduleMapper: PythonModuleMapper;

  beforeEach(() => {
    // Build an in-memory project file map.
    files = new Map([
      [
        "project/app/main.py",
        {
          path: "project/app/main.py",
          rootNode: parser.parse(`
          from module import submodule

          def foo():
              submodule.bar()
          `).rootNode,
        },
      ],
      [
        "module.py",
        {
          path: "module.py",
          rootNode: parser.parse(``).rootNode, // empty file for base module
        },
      ],
      [
        "module/submodule.py",
        {
          path: "module/submodule.py",
          rootNode: parser.parse(`
          def bar():
              pass
          `).rootNode,
        },
      ],
      [
        "project/app/empty.py",
        {
          path: "project/app/empty.py",
          rootNode: parser.parse(``).rootNode,
        },
      ],
      // A file that imports two internal modules but only uses one of them.
      [
        "project/app/multiple_imports.py",
        {
          path: "project/app/multiple_imports.py",
          rootNode: parser.parse(`
          from module import submodule
          from module import unused_module

          def used_function():
              submodule.bar()

          def unused_function():
              pass
          `).rootNode,
        },
      ],
      [
        "module/unused_module.py",
        {
          path: "module/unused_module.py",
          rootNode: parser.parse(`
          def do_nothing():
              pass
          `).rootNode,
        },
      ],

      // A file that imports multiple symbols from the same module, but only uses some.
      [
        "project/app/multiple_symbols_import.py",
        {
          path: "project/app/multiple_symbols_import.py",
          rootNode: parser.parse(`
          from module.multi_symbol_module import alpha, beta, gamma

          def call_alpha():
              alpha()

          def ignore_beta():
              pass
          `).rootNode,
        },
      ],
      [
        "module/multi_symbol_module.py",
        {
          path: "module/multi_symbol_module.py",
          rootNode: parser.parse(`
          def alpha():
              pass

          def beta():
              pass

          def gamma():
              pass
          `).rootNode,
        },
      ],

      // A file that uses aliased imports.
      [
        "project/app/aliased_imports.py",
        {
          path: "project/app/aliased_imports.py",
          rootNode: parser.parse(`
          import module.submodule as sb

          def do_something():
              sb.bar()
          `).rootNode,
        },
      ],

      // A file that imports and uses an external module.
      // For demonstration, treat "math" as external; the usage resolver
      // should detect usage of "sqrt" but can't resolve an internal path,
      // so it will mark it as isExternal: true.
      [
        "project/app/external_usage.py",
        {
          path: "project/app/external_usage.py",
          rootNode: parser.parse(`
          import math
          import os
          
          def compute_square_root(x):
              return math.sqrt(x)
          
          def do_nothing_with_os():
              pass
          `).rootNode,
        },
      ],

      // A file that has multiple exports, each using different imports.
      [
        "project/app/multiple_exports.py",
        {
          path: "project/app/multiple_exports.py",
          rootNode: parser.parse(`
          import math
          from module import submodule

          def export_one():
              math.floor(3.14)

          def export_two():
              submodule.bar()
          `).rootNode,
        },
      ],
    ]);

    // Initialize resolvers
    exportResolver = new PythonExportResolver(parser, files);
    moduleMapper = new PythonModuleMapper(files, exportResolver);
    importResolver = new PythonImportResolver(
      parser,
      files,
      moduleMapper,
      exportResolver,
    );
    usageResolver = new PythonUsageResolver(parser);

    dependencyResolver = new PythonDependencyResolver(
      parser,
      files,
      exportResolver,
      importResolver,
      usageResolver,
    );
  });

  // ------------------------------------------------------------------
  // Original tests
  // ------------------------------------------------------------------

  test("should resolve file-level dependencies for used submodule", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/main.py",
    );
    const fileDeps = manifesto.dependencies;

    // We expect the main file to have one dependency on "module/submodule.py".
    expect(fileDeps.size).toBe(1);
    // We expect the dependency on the submodule to be recorded with key "module/submodule.py".
    const subDep = fileDeps.get("module/submodule.py") as ModuleDependency;
    expect(subDep).toBeDefined();
    // Since the main file calls submodule.bar(), the dependency should list "bar" as used.
    expect(subDep.symbols.has("bar")).toBe(true);
  });

  test("should resolve symbol-level dependencies for exported symbol 'foo'", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/main.py",
    );

    // The export resolver should extract "foo" as an exported symbol from main.py.
    const fooDep = manifesto.symbols[0];
    expect(fooDep).toBeDefined();
    // Within the exported symbol's subtree, we expect to see usage of "bar" in "module/submodule.py".
    const symDeps = fooDep.dependencies;
    const subSymDep = symDeps.get("module/submodule.py") as ModuleDependency;
    expect(subSymDep).toBeDefined();
    expect(subSymDep.symbols.has("bar")).toBe(true);
  });

  test("should return empty dependencies for file with no imports", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/empty.py",
    );
    expect(manifesto.dependencies.size).toBe(0);
    expect(manifesto.symbols).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // Additional tests
  // ------------------------------------------------------------------

  test("1. multiple imports: only submodule is used", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/multiple_imports.py",
    );
    const fileDeps = manifesto.dependencies;

    // Expect only one file-level dependency: 'module/submodule.py'
    // because 'unused_module.py' is never used.
    expect(fileDeps.size).toBe(1);
    expect(fileDeps.has("module/submodule.py")).toBe(true);
    expect(fileDeps.has("module/unused_module.py")).toBe(false);

    // Check usage symbol-level
    const symbolDeps = manifesto.symbols.find(
      (s) => s.id === "used_function",
    )?.dependencies;
    expect(symbolDeps).toBeDefined();
    if (symbolDeps) {
      const usedFuncDep = symbolDeps.get(
        "module/submodule.py",
      ) as ModuleDependency;
      expect(usedFuncDep).toBeDefined();
      expect(usedFuncDep.symbols.has("bar")).toBe(true);
    }

    // "unused_function" should have no dependencies
    const unusedDeps = manifesto.symbols.find(
      (s) => s.id === "unused_function",
    )?.dependencies;
    expect(unusedDeps?.size).toBe(0);
  });

  test("2. multiple symbols import: only alpha is used", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/multiple_symbols_import.py",
    );
    const fileDeps = manifesto.dependencies;

    // The file-level usage should only reference "alpha" from multi_symbol_module.
    expect(fileDeps.size).toBe(1);

    const dep = fileDeps.get(
      "module/multi_symbol_module.py",
    ) as ModuleDependency;
    expect(dep).toBeDefined();
    // We only used "alpha", so it should be the only symbol present.
    expect(dep.symbols.has("alpha")).toBe(true);
    expect(dep.symbols.has("beta")).toBe(false);
    expect(dep.symbols.has("gamma")).toBe(false);

    // Symbol-level dependencies for "call_alpha"
    const callAlphaDep = manifesto.symbols.find(
      (s) => s.id === "call_alpha",
    )?.dependencies;
    expect(callAlphaDep).toBeDefined();
    if (callAlphaDep) {
      const alphaModDep = callAlphaDep.get("module/multi_symbol_module.py");
      expect(alphaModDep).toBeDefined();
      expect(alphaModDep?.symbols.has("alpha")).toBe(true);
    }

    // "ignore_beta" doesn't actually use anything
    const ignoreBetaDep = manifesto.symbols.find(
      (s) => s.id === "ignore_beta",
    )?.dependencies;
    expect(ignoreBetaDep?.size).toBe(0);
  });

  test("3. aliased imports: usage recognized via the alias name", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/aliased_imports.py",
    );
    const fileDeps = manifesto.dependencies;

    // The file-level usage should reference "module/submodule.py"
    expect(fileDeps.size).toBe(1);
    const dep = fileDeps.get("module/submodule.py") as ModuleDependency;
    expect(dep).toBeDefined();
    // We used "bar" under the alias "sb.bar()"
    expect(dep.symbols.has("bar")).toBe(true);

    // Symbol-level dependencies
    expect(manifesto.symbols.length).toBeGreaterThan(0);
    const doSomethingDep = manifesto.symbols.find(
      (s) => s.id === "do_something",
    )?.dependencies;
    expect(doSomethingDep?.get("module/submodule.py")).toBeDefined();
  });

  test("4. external module usage: 'math.sqrt'", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/external_usage.py",
    );
    const fileDeps = manifesto.dependencies;

    // The file-level usage should have 1 external module (math)
    // and possibly no usage for 'os' because we never call any function from it.
    expect(fileDeps.size).toBe(1);
    const mathDep = fileDeps.get("math") as ModuleDependency;
    expect(mathDep).toBeDefined();
    expect(mathDep.isExternal).toBe(true);
    expect(mathDep.symbols.size).toBe(0);

    // Symbol-level check for "compute_square_root"
    const computeDep = manifesto.symbols.find(
      (s) => s.id === "compute_square_root",
    )?.dependencies;
    expect(computeDep?.size).toBe(1);
    const mathDepSymbol = computeDep?.get("math");
    expect(mathDepSymbol).toBeDefined();
    expect(mathDepSymbol?.symbols.size).toBe(0);

    // "do_nothing_with_os" doesn't use anything from "os"
    const doNothingDep = manifesto.symbols.find(
      (s) => s.id === "do_nothing_with_os",
    )?.dependencies;
    expect(doNothingDep?.size).toBe(0);
  });

  test("5. multiple exports in a single file", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/multiple_exports.py",
    );
    const fileDeps = manifesto.dependencies;

    // We should have two dependencies at the file level:
    //   1) math (external)
    //   2) module/submodule.py (internal)
    expect(fileDeps.size).toBe(2);
    expect(fileDeps.has("math")).toBe(true);
    expect(fileDeps.has("module/submodule.py")).toBe(true);

    // Check file-level usage of symbols:
    //   - from math: "floor" is used
    //   - from submodule: "bar" is used
    const mathDep = fileDeps.get("math") as ModuleDependency;
    expect(mathDep).toBeDefined();
    expect(mathDep.symbols.size).toBe(0);

    const submoduleDep = fileDeps.get(
      "module/submodule.py",
    ) as ModuleDependency;
    expect(submoduleDep).toBeDefined();
    expect(submoduleDep.symbols.has("bar")).toBe(true);

    // Symbol-level check:
    // export_one uses math.floor
    const exportOne = manifesto.symbols.find((s) => s.id === "export_one");
    expect(exportOne).toBeDefined();
    const exportOneDeps = exportOne?.dependencies.get("math");
    expect(exportOneDeps).toBeDefined();
    expect(exportOneDeps?.symbols.size).toBe(0);

    // export_two uses submodule.bar
    const exportTwo = manifesto.symbols.find((s) => s.id === "export_two");
    expect(exportTwo).toBeDefined();
    const exportTwoDeps = exportTwo?.dependencies.get("module/submodule.py");
    expect(exportTwoDeps).toBeDefined();
    expect(exportTwoDeps?.symbols.has("bar")).toBe(true);
  });
});
