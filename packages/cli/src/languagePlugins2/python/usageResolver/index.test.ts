import { describe, test, expect, beforeAll } from "vitest";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import PythonUsageResolver, { ImportUsageResult } from "./index";
import { ModuleNode } from "../moduleMapper";

describe("PythonUsageResolver", () => {
  let parser: Parser;
  let usageResolver: PythonUsageResolver;

  beforeAll(() => {
    parser = new Parser();
    parser.setLanguage(Python);
    usageResolver = new PythonUsageResolver(parser);
  });

  /**
   * Helper function to get nodes to exclude (e.g., import statements)
   */
  function getNodesToExclude(root: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const query = new Parser.Query(
      parser.getLanguage(),
      `[
        (import_from_statement) @imp
        (import_statement) @imp
      ]`,
    );
    const captures = query.captures(root);
    return captures.map((cap) => cap.node);
  }

  test("should detect explicit symbol usage in base module", () => {
    const code = `
      from module import helper_func

      def foo():
          module.helper_func()
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Dummy ModuleNode for base module.
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      {
        identifier: "module",
        alias: undefined,
        moduleNode: baseModule,
        explicitSymbols: [{ identifier: "helper_func", alias: undefined }],
      },
      nodesToExclude,
    );
    // We expect one result for the base module.
    expect(results.size).toBe(1);
    const baseResult = results.get("module.py") as ImportUsageResult;
    expect(baseResult).toBeDefined();
    expect(baseResult.moduleNode.fullName).toBe("module");
    expect(baseResult.symbols).toEqual(["helper_func"]);
  });

  test("should detect usage of a submodule", () => {
    const code = `
      import module

      def foo():
          print(module.submodule.bar)
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Dummy ModuleNode for base module.
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };
    // Child ModuleNode representing submodule.
    const submodule: ModuleNode = {
      name: "submodule",
      fullName: "module.submodule",
      filePath: "module/submodule.py",
      symbols: [],
      children: new Map(),
      parent: baseModule,
    };
    baseModule.children.set("submodule", submodule);

    // Module info with no explicit symbols.
    const moduleInfo = {
      identifier: "module",
      alias: undefined,
      moduleNode: baseModule,
      explicitSymbols: [],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    // Expect one result for the submodule.
    expect(results.size).toBe(1);
    const subResult = results.get("module/submodule.py") as ImportUsageResult;
    expect(subResult).toBeDefined();
    expect(subResult.moduleNode.fullName).toBe("module.submodule");
    // The leftover part of the chain should be "bar"
    expect(subResult.symbols).toEqual(["bar"]);
  });

  test("should detect usage of a deeper submodule and symbol", () => {
    const code = `
      import module

      def foo():
          module.submodule.deep.symbol_func()
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Build a deeper module tree.
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };
    const submodule: ModuleNode = {
      name: "submodule",
      fullName: "module.submodule",
      filePath: "module/submodule.py",
      symbols: [],
      children: new Map(),
      parent: baseModule,
    };
    baseModule.children.set("submodule", submodule);
    const deepModule: ModuleNode = {
      name: "deep",
      fullName: "module.submodule.deep",
      filePath: "module/submodule/deep.py",
      symbols: [],
      children: new Map(),
      parent: submodule,
    };
    submodule.children.set("deep", deepModule);

    // Module info with no explicit symbols.
    const moduleInfo = {
      identifier: "module",
      alias: undefined,
      moduleNode: baseModule,
      explicitSymbols: [],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    // Expect one result for the deepest module.
    expect(results.size).toBe(1);
    const deepResult = results.get(
      "module/submodule/deep.py",
    ) as ImportUsageResult;
    expect(deepResult).toBeDefined();
    expect(deepResult.moduleNode.fullName).toBe("module.submodule.deep");
    // The leftover part of the chain should be "symbol_func"
    expect(deepResult.symbols).toEqual(["symbol_func"]);
  });

  test("should detect multiple symbol usages in the same submodule", () => {
    const code = `
      import module

      def foo():
          print(module.submodule.bar)
          print(module.submodule.baz)
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Create module tree.
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };
    const submodule: ModuleNode = {
      name: "submodule",
      fullName: "module.submodule",
      filePath: "module/submodule.py",
      symbols: [],
      children: new Map(),
      parent: baseModule,
    };
    baseModule.children.set("submodule", submodule);

    const moduleInfo = {
      identifier: "module",
      alias: undefined,
      moduleNode: baseModule,
      explicitSymbols: [],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    // Expect one result for the submodule.
    expect(results.size).toBe(1);
    const subResult = results.get("module/submodule.py") as ImportUsageResult;
    expect(subResult).toBeDefined();
    expect(subResult.moduleNode.fullName).toBe("module.submodule");
    // Both "bar" and "baz" should be detected (order may vary).
    expect(new Set(subResult.symbols)).toEqual(new Set(["bar", "baz"]));
  });

  test("should return an empty result if the module is imported but not used", () => {
    const code = `
      import module

      def foo():
          print("No module usage here")
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };

    const moduleInfo = {
      identifier: "module",
      alias: undefined,
      moduleNode: baseModule,
      explicitSymbols: [],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    expect(results.size).toBe(0);
  });

  test("should detect usage when module is imported with alias", () => {
    const code = `
      import module as mod
  
      def foo():
          print(mod.submodule.bar)
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Create a dummy ModuleNode for the base module "module".
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };

    // Create a child ModuleNode representing a submodule.
    const submodule: ModuleNode = {
      name: "submodule",
      fullName: "module.submodule",
      filePath: "module/submodule.py",
      symbols: [],
      children: new Map(),
      parent: baseModule,
    };
    baseModule.children.set("submodule", submodule);

    // Provide module info with an alias "mod".
    const moduleInfo = {
      identifier: "module",
      alias: "mod",
      moduleNode: baseModule,
      explicitSymbols: [] as { identifier: string; alias?: string }[],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    // We expect one result for the submodule.
    expect(results.size).toBe(1);
    const subResult = results.get("module/submodule.py") as ImportUsageResult;
    expect(subResult).toBeDefined();
    expect(subResult.moduleNode.fullName).toBe("module.submodule");
    // The remaining part of the chain should be "bar"
    expect(subResult.symbols).toEqual(["bar"]);
  });

  test("should detect explicit symbol usage with alias", () => {
    const code = `
      from module import helper_func as hf
  
      def foo():
          module.hf()
    `;
    const tree = parser.parse(code);
    const root = tree.rootNode;
    const nodesToExclude = getNodesToExclude(root);

    // Create a dummy ModuleNode for the base module.
    const baseModule: ModuleNode = {
      name: "module",
      fullName: "module",
      filePath: "module.py",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };

    // Provide module info with an explicit symbol that has an alias.
    // Here, the original identifier is "helper_func", but it is imported as "hf".
    const moduleInfo = {
      identifier: "module",
      alias: undefined,
      moduleNode: baseModule,
      explicitSymbols: [{ identifier: "helper_func", alias: "hf" }],
    };

    const results = usageResolver.resolveUsageForInternalModule(
      root,
      moduleInfo,
      nodesToExclude,
    );
    // We expect one result for the base module.
    expect(results.size).toBe(1);
    const baseResult = results.get("module.py") as ImportUsageResult;
    expect(baseResult).toBeDefined();
    expect(baseResult.moduleNode.fullName).toBe("module");
    // The explicit symbol should be detected by its alias "hf"
    expect(baseResult.symbols).toEqual(["hf"]);
  });
});
