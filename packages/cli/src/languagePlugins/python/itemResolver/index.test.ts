import { describe, test, expect, beforeEach } from "vitest";
import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonImportExtractor } from "../importExtractor";
import { PythonModuleResolver, PythonModule } from "../moduleResolver";
import { PythonItemResolver } from "./index";

describe("PythonSymbolResolver", () => {
  let resolver: PythonItemResolver;
  let moduleMapper: PythonModuleResolver;
  let exportExtractor: PythonExportExtractor;
  let importExtractor: PythonImportExtractor;
  let files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;

  beforeEach(() => {
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
        "moduleC.py",
        {
          path: "moduleC.py",
          rootNode: pythonParser.parse(`from moduleB import *`).rootNode,
        },
      ],
      [
        "moduleD.py",
        {
          path: "moduleD.py",
          rootNode: pythonParser.parse(`from moduleB import f as fooAlias`)
            .rootNode,
        },
      ],
      [
        "moduleE.py",
        {
          path: "moduleE.py",
          rootNode: pythonParser.parse(`import moduleA`).rootNode,
        },
      ],
      [
        "circular1.py",
        {
          path: "circular1.py",
          rootNode: pythonParser.parse(`from circular2 import circ_func`)
            .rootNode,
        },
      ],
      [
        "circular2.py",
        {
          path: "circular2.py",
          rootNode: pythonParser.parse(`from circular1 import circ_func`)
            .rootNode,
        },
      ],
      [
        "moduleF.py",
        {
          path: "moduleF.py",
          rootNode: pythonParser.parse(`
            from moduleA import foo
            def local_func(): pass
          `).rootNode,
        },
      ],
      [
        "moduleG.py",
        {
          path: "moduleG.py",
          rootNode: pythonParser.parse(`
            import moduleF
            from moduleF import local_func as alias_local
          `).rootNode,
        },
      ],
      [
        "package/__init__.py",
        {
          path: "package/__init__.py",
          rootNode: pythonParser.parse(`
            from .submodule import sub_func
          `).rootNode,
        },
      ],
      [
        "package/submodule.py",
        {
          path: "package/submodule.py",
          rootNode: pythonParser.parse(`
            def sub_func(): pass
          `).rootNode,
        },
      ],
    ]);

    exportExtractor = new PythonExportExtractor(pythonParser, files);
    importExtractor = new PythonImportExtractor(pythonParser, files);
    moduleMapper = new PythonModuleResolver(files);

    resolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleMapper,
    );
  });

  test("resolves directly defined symbols", () => {
    const moduleA = moduleMapper.pythonModule.children.get(
      "moduleA",
    ) as PythonModule;
    const result = resolver.resolveItem(moduleA, "foo");

    expect(result).toBeDefined();
    expect(result?.module.path).toBe("moduleA.py");
    expect(result?.symbol?.id).toBe("foo");
  });

  test("resolves symbols from nested imports", () => {
    const moduleG = moduleMapper.pythonModule.children.get(
      "moduleG",
    ) as PythonModule;
    const result = resolver.resolveItem(moduleG, "alias_local");

    expect(result).toBeDefined();
    expect(result?.module.path).toBe("moduleF.py");
    expect(result?.symbol?.id).toBe("local_func");
  });

  test("resolves package-level imports", () => {
    const pkg = moduleMapper.pythonModule.children.get(
      "package",
    ) as PythonModule;
    const result = resolver.resolveItem(pkg, "sub_func");

    expect(result).toBeDefined();
    expect(result?.module.path).toBe("package/submodule.py");
    expect(result?.symbol?.id).toBe("sub_func");
  });

  test("handles circular imports gracefully", () => {
    const circular1 = moduleMapper.pythonModule.children.get(
      "circular1",
    ) as PythonModule;
    const result = resolver.resolveItem(circular1, "circ_func");

    expect(result).toBeUndefined();
  });
});
