import { describe, test, expect, beforeAll } from "vitest";
import Parser, { Language } from "tree-sitter";
import Python from "tree-sitter-python";
import { PythonModuleMapper, ModuleNode } from "./index";
import { PythonExportResolver } from "../exportResolver";
import { sep } from "path";

/**
 * Helper function that creates a file map from a record of file paths to their contents.
 * The file map has keys as file paths and values as objects containing the file path and its Tree-sitter root node.
 *
 * @param files - An object mapping file paths to file contents.
 * @param parser - The Tree-sitter parser instance.
 * @returns A Map of file path to { path, rootNode }.
 */
function createFileMap(
  files: Record<string, string>,
  parser: Parser,
): Map<string, { path: string; rootNode: Parser.SyntaxNode }> {
  const map = new Map<string, { path: string; rootNode: Parser.SyntaxNode }>();
  for (const filePath in files) {
    const content = files[filePath];
    const tree = parser.parse(content);
    map.set(filePath, { path: filePath, rootNode: tree.rootNode });
  }
  return map;
}

describe("ModuleMapper - Complex Project Structure", () => {
  let parser: Parser;
  let fileMap: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  let exportResolver: PythonExportResolver;
  let mapper: PythonModuleMapper;
  let moduleMap: ModuleNode;

  beforeAll(() => {
    parser = new Parser();
    parser.setLanguage(Python as Language);

    // Define a complex project structure with various kinds of modules.
    const filesContent: Record<string, string> = {
      // Package module: __init__.py defines the package "project"
      "project/__init__.py": "class ProjectInit: pass",
      // File module under package "project"
      "project/main.py": "def main(): pass",
      // Package module: "project/utils" (has __init__.py)
      "project/utils/__init__.py": "class Utils: pass",
      // File module: "project/utils/helper.py"
      "project/utils/helper.py": "def helper(): pass",
      // Namespace module: "project/utils/math" is a directory without __init__.py
      "project/utils/math/operations.py": "def add(a, b): return a + b",
      // Namespace module: "project/utils/math/advanced" is a directory without __init__.py
      "project/utils/math/advanced/analysis.py": "def analyze(data): pass",
      // Package module: "project/sub" (has __init__.py)
      "project/sub/__init__.py": "class Sub: pass",
      // File modules under "project/sub"
      "project/sub/module.py": "variable = 42",
      "project/sub/module_extra.py": "def extra(): pass",
      // Package module: "project/sub/inner" (has __init__.py)
      "project/sub/inner/__init__.py": "class Inner: pass",
      // File module: "project/sub/inner/deep.py"
      "project/sub/inner/deep.py": "def deep_func(): pass",
      // File module directly under "project"
      "project/standalone.py": "def standalone(): pass",
      // Namespace module: "another_project" (directory without __init__.py)
      "another_project/module.py": "def another(): pass",
      "another_project/utils.py": "def util(): pass",
    };

    // Build the file map from file contents.
    fileMap = createFileMap(filesContent, parser);
    // Instantiate the export resolver and module mapper.
    exportResolver = new PythonExportResolver(parser, fileMap);
    mapper = new PythonModuleMapper(fileMap, exportResolver);
    // Build the module map.
    moduleMap = mapper.moduleMap;
  });

  describe("Top-level modules", () => {
    test("should contain 'project' and 'another_project'", () => {
      expect(moduleMap.children.has("project")).toBe(true);
      expect(moduleMap.children.has("another_project")).toBe(true);
    });
  });

  describe("Project package", () => {
    let projectNode: ModuleNode;
    beforeAll(() => {
      projectNode = moduleMap.children.get("project") as ModuleNode;
      expect(projectNode).toBeDefined();
    });
    test("should have fullName 'project' with filePath 'project/__init__.py'", () => {
      expect(projectNode.fullName).toBe("project");
      expect(projectNode.filePath).toBe("project/__init__.py");
    });
    test("its parent should be the root module map", () => {
      // For top-level packages, the parent is the root.
      expect(projectNode.parent).toBe(moduleMap);
    });
  });

  describe("File modules", () => {
    let projectNode: ModuleNode;
    beforeAll(() => {
      projectNode = moduleMap.children.get("project") as ModuleNode;
      expect(projectNode).toBeDefined();
    });
    test("should correctly resolve 'project/main.py'", () => {
      const mainNode = projectNode.children.get("main") as ModuleNode;
      expect(mainNode).toBeDefined();
      expect(mainNode.fullName).toBe("project.main");
      expect(mainNode.filePath).toBe("project/main.py");
      expect(mainNode.parent).toBe(projectNode);
    });
    test("should correctly resolve 'project/standalone.py'", () => {
      const standaloneNode = projectNode.children.get(
        "standalone",
      ) as ModuleNode;
      expect(standaloneNode).toBeDefined();
      expect(standaloneNode.fullName).toBe("project.standalone");
      expect(standaloneNode.filePath).toBe("project/standalone.py");
      expect(standaloneNode.parent).toBe(projectNode);
    });
  });

  describe("Package modules", () => {
    let projectNode: ModuleNode;
    beforeAll(() => {
      projectNode = moduleMap.children.get("project") as ModuleNode;
      expect(projectNode).toBeDefined();
    });
    test("should correctly resolve 'project/utils' as a package", () => {
      const utilsNode = projectNode.children.get("utils") as ModuleNode;
      expect(utilsNode).toBeDefined();
      expect(utilsNode.fullName).toBe("project.utils");
      expect(utilsNode.filePath).toBe("project/utils/__init__.py");
      expect(utilsNode.parent).toBe(projectNode);
    });
    test("should correctly resolve 'project/sub' as a package", () => {
      const subNode = projectNode.children.get("sub") as ModuleNode;
      expect(subNode).toBeDefined();
      expect(subNode.fullName).toBe("project.sub");
      expect(subNode.filePath).toBe("project/sub/__init__.py");
      expect(subNode.parent).toBe(projectNode);
    });
    test("should correctly resolve 'project/sub/inner' as a package", () => {
      const subNode = projectNode.children.get("sub") as ModuleNode;
      expect(subNode).toBeDefined();
      const innerNode = subNode.children.get("inner") as ModuleNode;
      expect(innerNode).toBeDefined();
      expect(innerNode.fullName).toBe("project.sub.inner");
      expect(innerNode.filePath).toBe("project/sub/inner/__init__.py");
      expect(innerNode.parent).toBe(subNode);
    });
  });

  describe("Namespace modules", () => {
    let utilsNode: ModuleNode;
    beforeAll(() => {
      const projectNode = moduleMap.children.get("project") as ModuleNode;
      expect(projectNode).toBeDefined();
      utilsNode = projectNode.children.get("utils") as ModuleNode;
      expect(utilsNode).toBeDefined();
    });
    test("should correctly resolve 'project/utils/math' as a namespace", () => {
      const mathNode = utilsNode.children.get("math") as ModuleNode;
      expect(mathNode).toBeDefined();
      expect(mathNode.fullName).toBe("project.utils.math");
      // Namespace modules do not have a filePath.
      expect(mathNode.filePath).toBeUndefined();
      expect(mathNode.parent).toBe(utilsNode);
    });
    test("should correctly resolve 'project/utils/math/advanced' as a namespace", () => {
      const mathNode = utilsNode.children.get("math") as ModuleNode;
      expect(mathNode).toBeDefined();
      const advancedNode = mathNode.children.get("advanced") as ModuleNode;
      expect(advancedNode).toBeDefined();
      expect(advancedNode.fullName).toBe("project.utils.math.advanced");
      expect(advancedNode.filePath).toBeUndefined();
      expect(advancedNode.parent).toBe(mathNode);
    });
  });

  describe("Child file modules within namespace", () => {
    let mathNode: ModuleNode;
    beforeAll(() => {
      const projectNode = moduleMap.children.get("project") as ModuleNode;
      expect(projectNode).toBeDefined();
      const utilsNode = projectNode.children.get("utils") as ModuleNode;
      expect(utilsNode).toBeDefined();
      mathNode = utilsNode.children.get("math") as ModuleNode;
      expect(mathNode).toBeDefined();
    });
    test("should correctly resolve 'project/utils/math/operations.py'", () => {
      const operationsNode = mathNode.children.get("operations") as ModuleNode;
      expect(operationsNode).toBeDefined();
      expect(operationsNode.fullName).toBe("project.utils.math.operations");
      expect(operationsNode.filePath).toBe("project/utils/math/operations.py");
      expect(operationsNode.parent).toBe(mathNode);
    });
    test("should correctly resolve 'project/utils/math/advanced/analysis.py'", () => {
      const advancedNode = mathNode.children.get("advanced") as ModuleNode;
      expect(advancedNode).toBeDefined();
      const analysisNode = advancedNode.children.get("analysis") as ModuleNode;
      expect(analysisNode).toBeDefined();
      expect(analysisNode.fullName).toBe(
        "project.utils.math.advanced.analysis",
      );
      expect(analysisNode.filePath).toBe(
        "project/utils/math/advanced/analysis.py",
      );
      expect(analysisNode.parent).toBe(advancedNode);
    });
  });

  describe("Modules in another top-level namespace", () => {
    let anotherProjectNode: ModuleNode;
    beforeAll(() => {
      anotherProjectNode = moduleMap.children.get(
        "another_project",
      ) as ModuleNode;
      expect(anotherProjectNode).toBeDefined();
    });
    test("should correctly resolve 'another_project' as a namespace", () => {
      expect(anotherProjectNode.fullName).toBe("another_project");
      expect(anotherProjectNode.filePath).toBeUndefined();
      // The parent of a top-level namespace is the root.
      expect(anotherProjectNode.parent).toBe(moduleMap);
    });
    test("should correctly resolve file modules under 'another_project'", () => {
      const moduleNode = anotherProjectNode.children.get(
        "module",
      ) as ModuleNode;
      expect(moduleNode).toBeDefined();
      expect(moduleNode.fullName).toBe("another_project.module");
      expect(moduleNode.filePath).toBe("another_project/module.py");
      expect(moduleNode.parent).toBe(anotherProjectNode);

      const utilsNode = anotherProjectNode.children.get("utils") as ModuleNode;
      expect(utilsNode).toBeDefined();
      expect(utilsNode.fullName).toBe("another_project.utils");
      expect(utilsNode.filePath).toBe("another_project/utils.py");
      expect(utilsNode.parent).toBe(anotherProjectNode);
    });
  });

  describe("getNodeFromFile function", () => {
    test("should return the correct node for 'project/main'", () => {
      // Note: getNodeFromFile expects a normalized path (without file extension, or __init__.py is handled specially)
      const node = mapper.getNodeFromFile(["project", "main"].join(sep));
      expect(node).toBeDefined();
      expect(node?.fullName).toBe("project.main");
      expect(node?.filePath).toBe("project/main.py");
    });
    test("should return the correct node for 'project/utils/helper'", () => {
      const node = mapper.getNodeFromFile(
        ["project", "utils", "helper"].join(sep),
      );
      expect(node).toBeDefined();
      expect(node?.fullName).toBe("project.utils.helper");
      expect(node?.filePath).toBe("project/utils/helper.py");
    });
    test("should return the correct node for 'project/utils/math/advanced/analysis'", () => {
      const node = mapper.getNodeFromFile(
        ["project", "utils", "math", "advanced", "analysis"].join(sep),
      );
      expect(node).toBeDefined();
      expect(node?.fullName).toBe("project.utils.math.advanced.analysis");
      expect(node?.filePath).toBe("project/utils/math/advanced/analysis.py");
    });
    test("should return undefined for a non-existent path", () => {
      const node = mapper.getNodeFromFile(["nonexistent", "path"].join(sep));
      expect(node).toBeUndefined();
    });
    test("should work with or without file extension", () => {
      const nodeWithExt = mapper.getNodeFromFile(
        ["project", "main.py"].join(sep),
      ) as ModuleNode;
      expect(nodeWithExt).toBeDefined();
      const nodeWithoutExt = mapper.getNodeFromFile(
        ["project", "main"].join(sep),
      ) as ModuleNode;
      expect(nodeWithoutExt).toBeDefined();
      expect(nodeWithExt).toEqual(nodeWithoutExt);
    });
  });

  describe("resolveImport method", () => {
    test("should resolve relative import with one dot (current package)", () => {
      // From "project/utils/helper.py", a relative import "." should yield the current package "project/utils".
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        ".",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("project.utils");
      expect(node.filePath).toBe("project/utils/__init__.py");
    });

    test("should resolve relative import with dot and submodule", () => {
      // From "project/utils/__init__.py", import ".helper" should resolve to "project.utils.helper".
      const node = mapper.resolveImport(
        "project/utils/__init__.py",
        ".helper",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("project.utils.helper");
      expect(node.filePath).toBe("project/utils/helper.py");
    });

    test("should resolve relative import with two dots", () => {
      // From "project/utils/helper.py" (a file module), import "..main" should yield "project.main".
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        "..main",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("project.main");
      expect(node.filePath).toBe("project/main.py");
    });

    test("should resolve absolute import using fallback from current file's package", () => {
      // From "project/utils/helper.py", an absolute import "project.sub.module" should yield "project.sub.module".
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        "project.sub.module",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("project.sub.module");
      expect(node.filePath).toBe("project/sub/module.py");
    });

    test("should resolve absolute import relative to an ancestor", () => {
      // From "project/utils/helper.py", absolute import "utils.helper" should yield "project.utils.helper".
      // Starting from the current package "project/utils" upward,
      // "utils.helper" eventually resolves as "project.utils.helper".
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        "utils.helper",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("project.utils.helper");
      expect(node.filePath).toBe("project/utils/helper.py");
    });

    test("should resolve absolute import from another top-level namespace", () => {
      // From "project/utils/helper.py", absolute import "another_project.module" should yield that module.
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        "another_project.module",
      ) as ModuleNode;
      expect(node).toBeDefined();
      expect(node.fullName).toBe("another_project.module");
      expect(node.filePath).toBe("another_project/module.py");
    });

    test("should return undefined for non-existent import", () => {
      const node = mapper.resolveImport(
        "project/utils/helper.py",
        "nonexistent.module",
      );
      expect(node).toBeUndefined();
    });
  });
});
