import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { PHPInvocationResolver } from "./index.ts";
import { PHPIncluseResolver } from "../incluseResolver/index.ts";
import { PHPRegistree } from "../registree/index.ts";
import { getPHPFilesMap } from "../testFiles/index.ts";
import { INVOCATIONS } from "../testFiles/constants.ts";

describe("PHP Invocation resolver", () => {
  const files = getPHPFilesMap();
  const registree = new PHPRegistree(files);
  const incluseres = new PHPIncluseResolver(registree);
  const resolver = new PHPInvocationResolver(incluseres);

  test("resolves invocations", () => {
    const invocations = resolver.getInvocationsForFile(INVOCATIONS);
    expect(invocations.unresolved.size >= 1).toBe(true);
    expect(invocations.unresolved).toContainEqual("doesnotexistlmao");
    const resolved = Array.from(invocations.resolved.keys());
    expect(resolved).toContainEqual("array");
    expect(resolved).toContainEqual("my_function");
    expect(resolved).toContainEqual("a");
    expect(resolved).toContainEqual("MyClass");
    expect(resolved).toContainEqual("All\\My\\Fellas\\f");
  });
});
