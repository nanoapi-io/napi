import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getPHPFilesMap } from "../testFiles/index.ts";
import { LEARN_PHP, NESTED } from "../testFiles/constants.ts";
import { PHPExportResolver } from "./index.ts";
import { PHP_CLASS, PHP_VARIABLE } from "./types.ts";

describe("PHP Export resolver", () => {
  const resolver = new PHPExportResolver();
  const files = getPHPFilesMap();

  test("resolves learnphp.php", () => {
    const namespaces = resolver.resolveFile(files.get(LEARN_PHP)!);
    expect(namespaces.get("My\\Namespace")).toBeDefined();
    const mynamespace = namespaces.get("My\\Namespace")!;
    expect(mynamespace.name).toBe("My\\Namespace");
    const symbols = mynamespace.symbols;
    expect(symbols.length).toBe(66);
  });

  test("resolves nested.php", () => {
    const namespaces = resolver.resolveFile(files.get(NESTED)!);
    expect(namespaces.get("")).toBeDefined();
    expect(namespaces.get("All")).toBeDefined();
    expect(namespaces.get("All\\My")).toBeDefined();
    expect(namespaces.get("All\\My\\Fellas")).toBeDefined();
    const rootns = namespaces.get("")!;
    expect(rootns.symbols.length).toBe(2);
    const x = rootns.symbols.find((s) => s.name === "x")!;
    expect(x.filepath).toBe(NESTED);
    expect(x.idNode).toBeDefined();
    expect(x.name).toBe("x");
    expect(x.namespace).toBe("");
    expect(x.node).toBeDefined();
    expect(x.type).toBe(PHP_VARIABLE);
    const rootClass = rootns.symbols.find((s) => s.name === "RootClass")!;
    expect(rootClass.namespace).toBe("");
    expect(rootClass.type).toBe(PHP_CLASS);
    expect(namespaces.get("All")!.symbols.length).toBe(1);
    expect(namespaces.get("All\\My")!.symbols.length).toBe(1);
    expect(namespaces.get("All\\My\\Fellas")!.symbols.length).toBe(1);
  });
});
