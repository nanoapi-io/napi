import { describe, test, expect } from "vitest";
import { CSharpExtensionResolver } from "./index.js";
import { CSharpNamespaceMapper } from "../namespaceMapper/index.js";
import { getCSharpFilesMap } from "../testFiles/index.js";

describe("CSharpExtensionResolver", () => {
  const files = getCSharpFilesMap();
  const nsMapper = new CSharpNamespaceMapper(files);
  const extensionResolver = new CSharpExtensionResolver(nsMapper);
  const extensions = extensionResolver.getExtensions();

  test("should resolve extension methods in the project", () => {
    expect(Object.keys(extensions).length).toBe(2);
    expect(extensions[""]).toBeDefined();
    expect(extensions[""].length).toBe(2);
    expect(extensions[""][0].name).toBeDefined();

    expect(extensions["MyApp.BeefBurger"]).toBeDefined();
    expect(extensions["MyApp.BeefBurger"].length).toBe(1);
    expect(extensions["MyApp.BeefBurger"][0].name).toBeDefined();
    expect(extensions["MyApp.BeefBurger"][0].name).toBe("Melt");
  });
});
