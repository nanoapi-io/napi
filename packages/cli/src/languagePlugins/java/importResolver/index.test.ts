import { getJavaFilesMap } from "../testFiles/index.ts";
import { BURGER, PEBBLE, WORMKILLER } from "../testFiles/constants.ts";
import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { JavaImportResolver } from "./index.ts";
import { JavaPackageMapper } from "../packageMapper/index.ts";

describe("Java Import Resolver", () => {
  const files = getJavaFilesMap();
  const mapper = new JavaPackageMapper(files);
  const resolver = new JavaImportResolver(mapper);

  test("unresolved external dependencies", () => {
    const burgerimports = resolver.imports.get(BURGER)!;
    expect(burgerimports.unresolved.length).toBe(2);
    expect(burgerimports.unresolved).toContain("java.io.File");
    expect(burgerimports.unresolved).toContain("java.lang.System");
  });

  test("resolved internal dependencies", () => {
    const killerimports = resolver.imports.get(WORMKILLER)!;
    expect(killerimports.resolved.size).toBe(2);
    expect(killerimports.unresolved.length).toBe(0);
    expect(killerimports.resolved.get("Steak")).toBeDefined();
    expect(killerimports.resolved.get("Pebble")).toBeDefined();
    expect(killerimports.resolved.get("Pebble.Sandworm")).toBeUndefined();
    expect(killerimports.resolved.get("Sandworm")).toBeUndefined();

    const pebbleimports = resolver.imports.get(PEBBLE)!;
    expect(pebbleimports.resolved.size).toBe(1);
    expect(pebbleimports.unresolved.length).toBe(0);
    expect(pebbleimports.resolved.get("Food")).toBeDefined();
  });
});
