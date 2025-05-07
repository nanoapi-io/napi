import { describe, expect, it } from "vitest";
import { removeIndexesFromSourceCode } from "./index.ts";

describe("removeIndexesFromSourceCode", () => {
  it("should return the original source code if no indexes are provided", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, []);
    expect(result).toBe(sourceCode);
  });

  it("should remove all the text if start and end indexes include all the text", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 0, endIndex: 10 },
    ]);
    expect(result).toBe("");
  });

  it("should remove a single range", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 1, endIndex: 9 },
    ]);
    expect(result).toBe("09");
  });

  it("should remove multiple non-overlapping indexes", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 0, endIndex: 1 }, // '0'
      { startIndex: 4, endIndex: 6 }, // '45'
      { startIndex: 9, endIndex: 10 }, // '9'
    ]);
    expect(result).toBe("123678");
  });

  it("should merge adjacent indexes", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 0, endIndex: 2 }, // '01'
      { startIndex: 2, endIndex: 3 }, // '2'
    ]);
    expect(result).toBe("3456789");
  });

  it("should merge overlapping indexes", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 0, endIndex: 3 }, // '012'
      { startIndex: 2, endIndex: 5 }, // '234'
    ]);
    expect(result).toBe("56789");
  });

  it("should handle indexes provided in random order", () => {
    const sourceCode = "0123456789";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 8, endIndex: 9 }, // '89'
      { startIndex: 2, endIndex: 4 }, // '3'
      { startIndex: 6, endIndex: 8 }, // '67'
    ]);
    expect(result).toBe("01459");
  });

  it("should handle empty source code", () => {
    const sourceCode = "";
    const result = removeIndexesFromSourceCode(sourceCode, [
      { startIndex: 0, endIndex: 0 },
    ]);
    expect(result).toBe("");
  });
});
