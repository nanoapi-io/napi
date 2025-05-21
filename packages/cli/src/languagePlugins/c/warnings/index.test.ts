import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CWarningManager } from "./index.ts";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import path from "node:path";

describe("CWarningManager", () => {
  const files = getCFilesMap();
  const manager = new CWarningManager(files);
  const diagnostics = manager.diagnostics;
  test("finds all diagnostics", () => {
    expect(diagnostics.length).toBe(2);
  });

  test("diagnostics are of correct type", () => {
    expect(diagnostics[0].message).toContain("Tree-sitter error");
    expect(diagnostics[1].message).toContain("Unnamed");
  });

  test("diagnostics are in correct files", () => {
    expect(diagnostics[0].filename).toBe(
      path.join(cFilesFolder, "errors.h"),
    );
    expect(diagnostics[1].filename).toBe(
      path.join(cFilesFolder, "errors.h"),
    );
  });
});
