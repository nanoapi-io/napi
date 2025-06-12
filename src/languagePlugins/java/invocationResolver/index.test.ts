import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getJavaFilesMap } from "../testFiles/index.ts";
import { JavaInvocationResolver } from "./index.ts";
import { JavaPackageMapper } from "../packageMapper/index.ts";
import { JavaImportResolver } from "../importResolver/index.ts";
import { APP, WORMKILLER } from "../testFiles/constants.ts";

describe("Java Invocation Resolver", () => {
  const files = getJavaFilesMap();
  const mapper = new JavaPackageMapper(files);
  const impResolver = new JavaImportResolver(mapper);
  const resolver = new JavaInvocationResolver(impResolver);
  const invocations = resolver.invocations;

  test("resolves Wormkiller.java", () => {
    const killerinv = invocations.get(WORMKILLER)!;
    expect(killerinv.unresolved.has("Sandworm")).toBe(true);
    expect(killerinv.unresolved.has("Pebble.Sandworm")).toBe(true);
    const resolved = Array.from(killerinv.resolved.keys());
    expect(resolved).toContain("Steak");
    expect(resolved).toContain("Pebble");
  });

  test("resolves App.java", () => {
    const appinv = invocations.get(APP)!;
    console.log(impResolver.imports.get(APP)!);
    expect(appinv.unresolved.has("System.out")).toBe(false);
    expect(appinv.unresolved.has("System")).toBe(true);
    const resolved = Array.from(appinv.resolved.keys());
    expect(resolved).toContain("restaurantCount");
  });
});
