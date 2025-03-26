import { describe, test, expect, beforeAll } from "vitest";
import Parser from "tree-sitter";
import { PythonExtraModule } from "./index";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import { PythonSimpleModuleMapper } from "../simpleModuleMapper";
import { pythonParser } from "../../../helpers/treeSitter/parsers";

// --- File contents ---

const submoduleCode = `
def foo():
    pass

def bar():
    pass
`;

const initCode = `
from submodule import foo, bar
`;

const anotherSubmoduleCode = `
from module import foo, bar
`;

const aliasedCode = `
from submodule import foo as f, bar
`;

// --- Test Suite ---

describe("PythonExtraModule", () => {
  let parser: Parser;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let moduleMapper: PythonSimpleModuleMapper;
  let submodule: PythonExtraModule;
  let moduleInit: PythonExtraModule;
  let anotherSubmodule: PythonExtraModule;

  beforeAll(() => {
    // Initialize the Tree-sitter parser for Python.
    parser = pythonParser;

    // Build a files map representing our project.
    files = new Map();
    files.set("module/submodule.py", {
      path: "module/submodule.py",
      rootNode: parser.parse(submoduleCode).rootNode,
    });
    files.set("module/__init__.py", {
      path: "module/__init__.py",
      rootNode: parser.parse(initCode).rootNode,
    });
    files.set("module/anothersubmodule.py", {
      path: "module/anothersubmodule.py",
      rootNode: parser.parse(anotherSubmoduleCode).rootNode,
    });

    // Initialize the extractors and module mapper.
    exportExtractor = new PythonExportExtractor(parser, files);
    importExtractor = new PythonImportExtractor(parser, files);
    moduleMapper = new PythonSimpleModuleMapper(files);

    console.log(11111, moduleMapper.moduleMap);

    // Create PythonExtraModule instances using their dotted full names.
    // "module" corresponds to the __init__.py file (the package).
    moduleInit = new PythonExtraModule(
      "",
      exportExtractor,
      importExtractor,
      moduleMapper,
    );
  });

  test("direct symbols from submodule", () => {
    const directSymbols = submodule.getDirectSymbols();
    expect(directSymbols).toHaveLength(2);
    const ids = directSymbols.map((s) => s.identifier);
    expect(ids).toContain("foo");
    expect(ids).toContain("bar");
  });

  test("indirect symbols from __init__.py re-export", () => {
    // __init__.py re-exports from submodule.
    const indirectSymbols = moduleInit.getIndirectSymbols();
    // Expect two re-exported symbols.
    expect(indirectSymbols).toHaveLength(2);
    const ids = indirectSymbols.map((s) => s.identifier);
    expect(ids).toContain("foo");
    expect(ids).toContain("bar");
    // The true definition of these symbols comes from submodule.
    for (const sym of indirectSymbols) {
      expect(sym.sourceModuleFullName).toBe("module.submodule");
    }
  });

  test("indirect symbols from anothersubmodule re-export", () => {
    // anothersubmodule imports from "module", which in turn re-exports from submodule.
    const indirectSymbols = anotherSubmodule.getIndirectSymbols();
    expect(indirectSymbols).toHaveLength(2);
    const ids = indirectSymbols.map((s) => s.identifier);
    expect(ids).toContain("foo");
    expect(ids).toContain("bar");
    for (const sym of indirectSymbols) {
      expect(sym.sourceModuleFullName).toBe("module.submodule");
    }
  });

  test("alias handling for re-exported symbols", () => {
    // Add a new file for alias testing.
    files.set("module/aliased.py", {
      path: "module/aliased.py",
      rootNode: parser.parse(aliasedCode).rootNode,
    });
    // Rebuild the module mapper and extractors so that the new file is included.
    moduleMapper = new PythonSimpleModuleMapper(files);
    exportExtractor = new PythonExportExtractor(parser, files);
    importExtractor = new PythonImportExtractor(parser, files);
    const aliasedModule = new PythonExtraModule(
      "module.aliased",
      exportExtractor,
      importExtractor,
      moduleMapper,
    );

    const indirectSymbols = aliasedModule.getIndirectSymbols();
    expect(indirectSymbols).toHaveLength(2);
    // For "foo", an alias "f" should be set; for "bar", alias remains undefined.
    const fooSymbol = indirectSymbols.find((s) => s.identifier === "foo");
    expect(fooSymbol).toBeDefined();
    expect(fooSymbol?.alias).toBe("f");

    const barSymbol = indirectSymbols.find((s) => s.identifier === "bar");
    expect(barSymbol).toBeDefined();
    expect(barSymbol?.alias).toBeUndefined();
  });
});
