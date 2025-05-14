import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CMetricsAnalyzer } from "./index.ts";
import { cFilesFolder, getCFilesMap } from "../testFiles/index.ts";
import path from "node:path";

describe("CMetricsAnalyzer", () => {
  const analyzer = new CMetricsAnalyzer();
  const files = getCFilesMap();

  const analyzeFile = (filePath: string) => {
    const absolutePath = path.join(cFilesFolder, filePath);
    const file = files.get(absolutePath);
    if (!file) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    return analyzer.analyzeNode(file.rootNode);
  };

  test("burgers.c", () => {
    const metrics = analyzeFile("burgers.c");
    expect(metrics.characterCount >= 1485).toBe(true);
    expect(metrics.codeCharacterCount < 1485).toBe(true);
    expect(metrics.linesCount >= 53).toBe(true);
    expect(metrics.codeLinesCount < 53).toBe(true);
    expect(metrics.cyclomaticComplexity >= 6).toBe(true);
  });

  test("burgers.h", () => {
    const metrics = analyzeFile("burgers.h");
    expect(metrics.characterCount >= 1267).toBe(true);
    expect(metrics.codeCharacterCount < 1267).toBe(true);
    expect(metrics.linesCount >= 71).toBe(true);
    expect(metrics.codeLinesCount < 71).toBe(true);
    expect(metrics.cyclomaticComplexity).toBe(1);
  });

  test("crashcases.h", () => {
    const metrics = analyzeFile("crashcases.h");
    expect(metrics.characterCount >= 956).toBe(true);
    expect(metrics.codeCharacterCount < 956).toBe(true);
    expect(metrics.linesCount >= 33).toBe(true);
    expect(metrics.codeLinesCount < 33).toBe(true);
    expect(metrics.cyclomaticComplexity).toBe(0);
  });
});
