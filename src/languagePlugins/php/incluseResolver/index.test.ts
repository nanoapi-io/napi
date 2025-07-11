import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getPHPFilesMap } from "../testFiles/index.ts";
import { PHPRegistree } from "../registree/index.ts";
import { PHPIncluseResolver } from "./index.ts";
import { INCLUDE, USE } from "../testFiles/constants.ts";

describe("PHP Incluse resolver", () => {
  const files = getPHPFilesMap();
  const registree = new PHPRegistree(files);
  const resolver = new PHPIncluseResolver(registree);

  test("resolves use directives", () => {
    const imports = resolver.resolveImports(registree.registry.files.get(USE)!);
    expect(imports.unresolved.namespaces.length).toBe(1);
    expect(imports.unresolved.namespaces).toContainEqual("I\\Do\\Not\\Exist");
    expect(imports.resolved.get("f")).toBeDefined(); // nested.php
    expect(imports.resolved.get("my_function")).toBeDefined(); // learnphp function
    expect(imports.resolved.get("MyClass")).toBeDefined(); // learnphp class
    expect(imports.resolved.get("wheels")).toBeDefined(); // leanrphp variable
  });

  test("resolves include directives", () => {
    const imports = resolver.resolveImports(
      registree.registry.files.get(INCLUDE)!,
    );
    expect(imports.unresolved.paths.length).toBe(1);
    expect(imports.unresolved.paths).toContainEqual("unresolved.php");
    expect(imports.resolved.get("f")).toBeDefined(); // nested.php
    expect(imports.resolved.get("defined_in_used_file")).toBeDefined(); // use.php
    expect(imports.resolved.get("my_function")).toBeDefined(); // learnphp function
    expect(imports.resolved.get("MyClass")).toBeDefined(); // learnphp class
    expect(imports.resolved.get("wheels")).toBeDefined(); // leanrphp variable
  });
});
