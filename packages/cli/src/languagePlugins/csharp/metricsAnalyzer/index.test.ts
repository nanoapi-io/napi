import { describe, test, expect } from "vitest";
import { CSharpMetricsAnalyzer } from "./index.js";
import { getCSharpFilesMap, csharpFilesFolder } from "../testFiles/index.js";
import path from "path";

describe("CSharpMetricsAnalyzer", () => {
  const analyzer = new CSharpMetricsAnalyzer();
  const files = getCSharpFilesMap();

  const analyzeFile = (filePath: string) => {
    const absolutePath = path.join(csharpFilesFolder, filePath);
    const file = files.get(absolutePath);
    if (!file) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    return analyzer.analyzeNode(file.rootNode);
  };

  test("Analyzes 2Namespaces1File.cs", () => {
    const metrics = analyzeFile("2Namespaces1File.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 0, // No control flow statements in this file
      linesCount: 13, // Total lines in the file
      codeLinesCount: 12, // Excluding blank lines and comments
      characterCount: expect.any(Number), // Total characters in the file
      codeCharacterCount: expect.any(Number), // Characters excluding comments and whitespace
    });
  });

  test("Analyzes Models.cs", () => {
    const metrics = analyzeFile("Models.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 0, // No control flow statements in this file
      linesCount: 23, // Total lines in the file
      codeLinesCount: 22, // Excluding blank lines and comments
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes Namespaced.cs", () => {
    const metrics = analyzeFile("Namespaced.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 4,
      linesCount: 18,
      codeLinesCount: 17,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes Nested.cs", () => {
    const metrics = analyzeFile("Nested.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 1,
      linesCount: 32,
      codeLinesCount: 31,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes OtherFileSameNamespace.cs", () => {
    const metrics = analyzeFile("OtherFileSameNamespace.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 0, // No control flow statements
      linesCount: 3,
      codeLinesCount: 2,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes Program.cs", () => {
    const metrics = analyzeFile("Program.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 0, // No control flow statements in the main method
      linesCount: 34,
      codeLinesCount: 26,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes SemiNamespaced.cs", () => {
    const metrics = analyzeFile("SemiNamespaced.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 0,
      linesCount: 32,
      codeLinesCount: 29,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });

  test("Analyzes Usage.cs", () => {
    const metrics = analyzeFile("Usage.cs");
    expect(metrics).toMatchObject({
      cyclomaticComplexity: 2,
      linesCount: 25,
      codeLinesCount: 24,
      characterCount: expect.any(Number),
      codeCharacterCount: expect.any(Number),
    });
  });
});
