// PythonModuleResolver.test.ts
import { beforeAll, describe, expect, test } from "vitest";
import Parser from "tree-sitter";
import {
  PythonModuleResolver,
  PYTHON_MODULE_TYPE,
  PYTHON_NAMESPACE_MODULE_TYPE,
  PythonModule,
  PYTHON_PACKAGE_MODULE_TYPE,
} from "./index"; // adjust the path if necessary
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { sep } from "path";

// Create a real parser using the Python language.
const parser = pythonParser;

// Helper: Create a dummy file record with a given filePath.
function createFiles(paths: string[]) {
  // We don't care about the content; use an empty string.
  const fileMap = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  paths.forEach((path) => {
    fileMap.set(path, { path: path, rootNode: parser.parse("").rootNode });
  });
  return fileMap;
}

describe("PythonModuleResolver, map resolution", () => {
  test("should build module map for a single .py file", () => {
    // For a simple file "foo.py" at the root.
    const files = createFiles(["foo.py"]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "foo" (derived from "foo.py")
    const fooModule = root.children.get("foo") as PythonModule;
    expect(fooModule).toBeDefined();
    expect(fooModule.name).toBe("foo");
    expect(fooModule.type).toBe(PYTHON_MODULE_TYPE);
    expect(fooModule.path).toBe("foo.py");
    expect(fooModule.fullName).toBe("foo");
  });

  test("should build module map for a package with __init__.py", () => {
    // For a package with an __init__.py file.
    const files = createFiles(["pkg/__init__.py"]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "pkg" (derived from "pkg/__init__.py")
    const pkgModule = root.children.get("pkg") as PythonModule;
    expect(pkgModule).toBeDefined();
    expect(pkgModule.name).toBe("pkg");
    expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(pkgModule.path).toBe("pkg/__init__.py");
    expect(pkgModule.fullName).toBe("pkg");
    expect(pkgModule.children.size).toBe(0);
    expect(pkgModule.parent).toBe(root);
  });

  test("should build module map for a package with a module", () => {
    // For a package with an __init__.py file and a module.
    const files = createFiles(["pkg/__init__.py", "pkg/module.py"]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "pkg" (derived from "pkg/__init__.py")
    const pkgModule = root.children.get("pkg") as PythonModule;
    expect(pkgModule).toBeDefined();
    expect(pkgModule.name).toBe("pkg");
    expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(pkgModule.path).toBe("pkg/__init__.py");
    expect(pkgModule.fullName).toBe("pkg");
    expect(pkgModule.children.size).toBe(1);
    expect(pkgModule.parent).toBe(root);

    // Expect a child with key "module" (derived from "pkg/module.py")
    const moduleModule = pkgModule.children.get("module") as PythonModule;
    expect(moduleModule).toBeDefined();
    expect(moduleModule.name).toBe("module");
    expect(moduleModule.type).toBe(PYTHON_MODULE_TYPE);
    expect(moduleModule.path).toBe("pkg/module.py");
    expect(moduleModule.fullName).toBe("pkg.module");
    expect(moduleModule.children.size).toBe(0);
    expect(moduleModule.parent).toBe(pkgModule);
  });

  test("should build module map for a package with a nested package", () => {
    // For a package with an __init__.py file and a nested package.
    const files = createFiles(["pkg/__init__.py", "pkg/subpkg/__init__.py"]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "pkg" (derived from "pkg/__init__.py")
    const pkgModule = root.children.get("pkg") as PythonModule;
    expect(pkgModule).toBeDefined();
    expect(pkgModule.name).toBe("pkg");
    expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(pkgModule.path).toBe("pkg/__init__.py");
    expect(pkgModule.fullName).toBe("pkg");
    expect(pkgModule.children.size).toBe(1);
    expect(pkgModule.parent).toBe(root);

    // Expect a child with key "subpkg" (derived from "pkg/subpkg/__init__.py")
    const subpkgModule = pkgModule.children.get("subpkg") as PythonModule;
    expect(subpkgModule).toBeDefined();
    expect(subpkgModule.name).toBe("subpkg");
    expect(subpkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(subpkgModule.path).toBe("pkg/subpkg/__init__.py");
    expect(subpkgModule.fullName).toBe("pkg.subpkg");
    expect(subpkgModule.children.size).toBe(0);
    expect(subpkgModule.parent).toBe(pkgModule);
  });

  test("should build module map for a package with a module and a nested package", () => {
    // For a package with an __init__.py file, a module, and a nested package.
    const files = createFiles([
      "pkg/__init__.py",
      "pkg/module.py",
      "pkg/subpkg/__init__.py",
    ]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "pkg" (derived from "pkg/__init__.py")
    const pkgModule = root.children.get("pkg") as PythonModule;
    expect(pkgModule).toBeDefined();
    expect(pkgModule.name).toBe("pkg");
    expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(pkgModule.path).toBe("pkg/__init__.py");
    expect(pkgModule.fullName).toBe("pkg");
    expect(pkgModule.children.size).toBe(2);
    expect(pkgModule.parent).toBe(root);

    // Expect a child with key "module" (derived from "pkg/module.py")
    const moduleModule = pkgModule.children.get("module") as PythonModule;
    expect(moduleModule).toBeDefined();
    expect(moduleModule.name).toBe("module");
    expect(moduleModule.type).toBe(PYTHON_MODULE_TYPE);
    expect(moduleModule.path).toBe("pkg/module.py");
    expect(moduleModule.fullName).toBe("pkg.module");
    expect(moduleModule.children.size).toBe(0);
    expect(moduleModule.parent).toBe(pkgModule);

    // Expect a child with key "subpkg" (derived from "pkg/subpkg/__init__.py")
    const subpkgModule = pkgModule.children.get("subpkg") as PythonModule;
    expect(subpkgModule).toBeDefined();
    expect(subpkgModule.name).toBe("subpkg");
    expect(subpkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(subpkgModule.path).toBe("pkg/subpkg/__init__.py");
    expect(subpkgModule.fullName).toBe("pkg.subpkg");
    expect(subpkgModule.children.size).toBe(0);
    expect(subpkgModule.parent).toBe(pkgModule);
  });

  test("should build module map for a package with a module and a nested package with a module", () => {
    // For a package with an __init__.py file, a module, and a nested package with a module.
    const files = createFiles([
      "pkg/__init__.py",
      "pkg/module.py",
      "pkg/subpkg/__init__.py",
      "pkg/subpkg/submodule.py",
    ]);

    const mapper = new PythonModuleResolver(files);
    const root = mapper.pythonModule;

    // The root is a namespace with empty name.
    expect(root.name).toBe("");
    expect(root.type).toBe(PYTHON_NAMESPACE_MODULE_TYPE);
    expect(root.path).toBe("");
    expect(root.fullName).toBe("");

    expect(root.children.size).toBe(1);

    // Expect a child with key "pkg" (derived from "pkg/__init__.py")
    const pkgModule = root.children.get("pkg") as PythonModule;
    expect(pkgModule).toBeDefined();
    expect(pkgModule.name).toBe("pkg");
    expect(pkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(pkgModule.path).toBe("pkg/__init__.py");
    expect(pkgModule.fullName).toBe("pkg");
    expect(pkgModule.children.size).toBe(2);
    expect(pkgModule.parent).toBe(root);

    // Expect a child with key "module" (derived from "pkg/module.py")
    const moduleModule = pkgModule.children.get("module") as PythonModule;
    expect(moduleModule).toBeDefined();
    expect(moduleModule.name).toBe("module");
    expect(moduleModule.type).toBe(PYTHON_MODULE_TYPE);
    expect(moduleModule.path).toBe("pkg/module.py");
    expect(moduleModule.fullName).toBe("pkg.module");
    expect(moduleModule.children.size).toBe(0);
    expect(moduleModule.parent).toBe(pkgModule);

    // Expect a child with key "subpkg" (derived from "pkg/subpkg/__init__.py")
    const subpkgModule = pkgModule.children.get("subpkg") as PythonModule;
    expect(subpkgModule).toBeDefined();
    expect(subpkgModule.name).toBe("subpkg");
    expect(subpkgModule.type).toBe(PYTHON_PACKAGE_MODULE_TYPE);
    // expect(subpkgModule.path).toBe("pkg/subpkg/__init__.py");
    expect(subpkgModule.fullName).toBe("pkg.subpkg");
    expect(subpkgModule.children.size).toBe(1);
    expect(subpkgModule.parent).toBe(pkgModule);

    // Expect a child with key "submodule"
    const submoduleModule = subpkgModule.children.get(
      "submodule",
    ) as PythonModule;
    expect(submoduleModule).toBeDefined();
    expect(submoduleModule.name).toBe("submodule");
    expect(submoduleModule.type).toBe(PYTHON_MODULE_TYPE);
    expect(submoduleModule.path).toBe("pkg/subpkg/submodule.py");
    expect(submoduleModule.fullName).toBe("pkg.subpkg.submodule");
    expect(submoduleModule.children.size).toBe(0);
    expect(submoduleModule.parent).toBe(subpkgModule);
  });
});

describe("PythonModuleResolver, resolveModule method - Complex Cases", () => {
  let mapper: PythonModuleResolver;

  beforeAll(() => {
    // Simulate a more complex project structure:
    // project/
    //   pkg/
    //     __init__.py           --> package
    //     module.py             --> module inside pkg
    //     helper.py             --> module inside pkg
    //     subpkg/
    //       __init__.py         --> nested package
    //       submodule.py        --> module inside subpkg
    //   main.py                 --> module at project root
    //   util.py                 --> module at project root
    const paths = [
      `project${sep}pkg${sep}__init__.py`,
      `project${sep}pkg${sep}module.py`,
      `project${sep}pkg${sep}helper.py`,
      `project${sep}pkg${sep}subpkg${sep}__init__.py`,
      `project${sep}pkg${sep}subpkg${sep}submodule.py`,
      `project${sep}main.py`,
      `project${sep}util.py`,
    ];
    const files = createFiles(paths);
    mapper = new PythonModuleResolver(files);
  });

  test("should resolve relative import '..helper' from 'project/pkg/subpkg/submodule.py'", () => {
    // From "project/pkg/subpkg/submodule.py", the relative import "..helper"
    // means: go up one level (to pkg/subpkg's parent, which is pkg) and then look for "helper".
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    const resolved = mapper.resolveModule(currentFile, "..helper");
    expect(resolved).toBeDefined();
    // Expect resolved module to have name "helper" and fullName "project.pkg.helper"
    expect(resolved?.name).toBe("helper");
    expect(resolved?.fullName).toBe("project.pkg.helper");
  });

  test("should resolve relative import '..module' from 'project/pkg/subpkg/submodule.py'", () => {
    // Similarly, "..module" should resolve to "project/pkg/module.py"
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    const resolved = mapper.resolveModule(currentFile, "..module");
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe("module");
    expect(resolved?.fullName).toBe("project.pkg.module");
  });

  test("should resolve relative import '...main' from 'project/pkg/subpkg/submodule.py'", () => {
    // Three dots means: go up two levels.
    // From "project/pkg/subpkg/submodule.py", two levels up is "project"
    // Then look for "main" within "project", i.e. "project/main.py".
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    const resolved = mapper.resolveModule(currentFile, "...main");
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe("main");
    expect(resolved?.fullName).toBe("project.main");
  });

  test("should resolve absolute import 'pkg.helper' from 'project/pkg/subpkg/submodule.py'", () => {
    // From a nested module, absolute import "pkg.helper" should be resolved.
    // The algorithm walks upward until it finds the correct candidate.
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    const resolved = mapper.resolveModule(currentFile, "pkg.helper");
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe("helper");
    expect(resolved?.fullName).toBe("project.pkg.helper");
  });

  test("should resolve absolute import 'util' from 'project/pkg/subpkg/submodule.py'", () => {
    // From "project/pkg/subpkg/submodule.py", absolute import "util" should resolve to "project/util.py"
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    const resolved = mapper.resolveModule(currentFile, "util");
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe("util");
    expect(resolved?.fullName).toBe("project.util");
  });

  test("should return undefined for a relative import that goes too high", () => {
    // If we try to go up more levels than exist, expect undefined.
    const currentFile = `project${sep}pkg${sep}subpkg${sep}submodule.py`;
    // Here, "....nonexistent" (four dots) would require going up three levels.
    const resolved = mapper.resolveModule(currentFile, "....nonexistent");
    expect(resolved).toBeUndefined();
  });
});
