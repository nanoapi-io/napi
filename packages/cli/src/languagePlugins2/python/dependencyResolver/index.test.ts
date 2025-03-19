import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { ModuleDependency, PythonDependencyResolver } from "./index";
import { PythonExportResolver } from "../exportResolver";
import { PythonImportResolver } from "../importResolver";
import { PythonUsageResolver } from "../usageResolver";
import { PythonModuleMapper } from "../moduleMapper";

// Create a Tree-sitter parser and set the language to Python.
const parser = new Parser();
parser.setLanguage(Python);

describe("PythonDependencyResolver", () => {
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let dependencyResolver: PythonDependencyResolver;
  let exportResolver: PythonExportResolver;
  let importResolver: PythonImportResolver;
  let usageResolver: PythonUsageResolver;
  let moduleMapper: PythonModuleMapper;

  beforeEach(() => {
    // Build an in-memory project file map.
    // "project/app/main.py" imports "submodule" from "module"
    // and then calls "submodule.bar()".
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
    ]);

    // Initialize resolvers using the actual files map.
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

  test("should resolve file-level dependencies for used submodule", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/main.py",
    );
    const fileDeps = manifesto.fileDependencies;

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
    const symDeps = fooDep.fileDependencies;
    const subSymDep = symDeps.get("module/submodule.py") as ModuleDependency;
    expect(subSymDep).toBeDefined();
    expect(subSymDep.symbols.has("bar")).toBe(true);
  });

  test("should return empty dependencies for file with no imports", () => {
    const manifesto = dependencyResolver.getFileDependencies(
      "project/app/empty.py",
    );
    expect(manifesto.fileDependencies.size).toBe(0);
    expect(manifesto.symbols).toHaveLength(0);
  });
});
