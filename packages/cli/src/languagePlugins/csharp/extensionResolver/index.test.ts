import { describe, test, expect } from "vitest";
import { CSharpExtensionResolver } from ".";
import { CSharpNamespaceMapper } from "../namespaceMapper";
import { getCSharpFilesMap } from "../testFiles";

describe("CSharpExtensionResolver", () => {
  const files = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);
  const extensionResolver = new CSharpExtensionResolver(nsMapper);
  const extensions = extensionResolver.resolveExtensionMethodsInNamespaceTree();

  test("should resolve extension methods in the project", () => {
    expect(Object.keys(extensions).length).toBe(1);
    expect(extensions[""]).toBeDefined();
    expect(extensions[""]["Bite"]).toBeDefined();
    expect(extensions[""]["Heal"].name).toBeDefined();
  });
});
