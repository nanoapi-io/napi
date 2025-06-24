import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getPHPFilesMap } from "../testFiles/index.ts";
import { LEARN_PHP, NESTED } from "../testFiles/constants.ts";
import { PHPExportResolver } from "./index.ts";
import {
  PHP_CLASS,
  PHP_FUNCTION,
  PHP_INTERFACE,
  PHP_VARIABLE,
} from "./types.ts";

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
    expect(namespaces.get("")).toBeUndefined();
    expect(namespaces.get("All")).toBeDefined();
    expect(namespaces.get("All\\My")).toBeDefined();
    expect(namespaces.get("All\\My\\Fellas")).toBeDefined();
    expect(namespaces.get("All")!.symbols.length).toBe(1);
    const a = namespaces.get("All")!.symbols[0];
    expect(a.filepath).toBe(NESTED);
    expect(a.idNode).toBeDefined();
    expect(a.name).toBe("a");
    expect(a.namespace).toBe("All");
    expect(a.node).toBeDefined();
    expect(a.type).toBe(PHP_VARIABLE);
    expect(namespaces.get("All\\My")!.symbols.length).toBe(1);
    const m = namespaces.get("All\\My")!.symbols[0];
    expect(m.name).toBe("m");
    expect(m.type).toBe(PHP_FUNCTION);
    expect(namespaces.get("All\\My\\Fellas")!.symbols.length).toBe(1);
    const f = namespaces.get("All\\My\\Fellas")!.symbols[0];
    expect(f.name).toBe("f");
    expect(f.type).toBe(PHP_INTERFACE);
  });
});
