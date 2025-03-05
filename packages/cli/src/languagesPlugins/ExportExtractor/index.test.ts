import { describe, it, expect } from "vitest";
import {
  generateExportMap,
  getExportExtractor,
  UnsupportedExtensionForExportExtractorError,
} from "./index";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";

// Set up the Tree-sitter parser for Python
const parser = new Parser();
parser.setLanguage(Python);

describe("generateExportMap", () => {
  it("should generate an export map for a valid Python file", () => {
    const files = [{ path: "test.py", code: "def my_function(): pass" }];
    const exportMap = generateExportMap(files);

    expect(exportMap).toHaveProperty("test.py");
    expect(exportMap["test.py"].couldNotProcess).toBe(false);
    expect(exportMap["test.py"].exportStatements.length).toBe(1);
    expect(
      exportMap["test.py"].exportStatements[0].members[0].identifierNode.text,
    ).toBe("my_function");
  });

  it("should return an empty export map for a Python file with no exports", () => {
    const files = [{ path: "empty.py", code: "" }];
    const exportMap = generateExportMap(files);

    expect(exportMap).toHaveProperty("empty.py");
    expect(exportMap["empty.py"].language).toBe(Python.name);
    expect(exportMap["empty.py"].couldNotProcess).toBe(false);
    expect(exportMap["empty.py"].exportStatements).toEqual([]);
  });

  it("should handle multiple files", () => {
    const files = [
      { path: "file1.py", code: "def my_function(): pass" },
      { path: "file2.py", code: "class MyClass: pass" },
    ];
    const exportMap = generateExportMap(files);

    expect(Object.keys(exportMap)).toEqual(["file1.py", "file2.py"]);
    expect(exportMap["file1.py"].language).toBe(Python.name);
    expect(exportMap["file1.py"].couldNotProcess).toBe(false);
    expect(exportMap["file1.py"].exportStatements.length).toBe(1);
    expect(
      exportMap["file1.py"].exportStatements[0].members[0].identifierNode.text,
    ).toBe("my_function");
    expect(exportMap["file2.py"].language).toBe(Python.name);
    expect(exportMap["file2.py"].couldNotProcess).toBe(false);
    expect(exportMap["file2.py"].exportStatements.length).toBe(1);
    expect(
      exportMap["file2.py"].exportStatements[0].members[0].identifierNode.text,
    ).toBe("MyClass");
  });

  it("should return an error for unsupported file extensions", () => {
    const files = [{ path: "script.js", code: "function foo() {}" }];
    const exportMap = generateExportMap(files);

    expect(exportMap).toHaveProperty("script.js");
    expect(exportMap["script.js"].language).toBe("unknown");
    expect(exportMap["script.js"].couldNotProcess).toBe(true);
    expect(exportMap["script.js"].exportStatements).toEqual([]);
  });

  it("should handle syntax errors gracefully", () => {
    // tree sitter struggle to parse long lines
    const code = ".".repeat(100000);
    const files = [
      {
        path: "broken.py",
        code,
      },
    ];
    const exportMap = generateExportMap(files);

    expect(exportMap).toHaveProperty("broken.py");
    expect(exportMap["broken.py"].language).toBe(Python.name);
    expect(exportMap["broken.py"].couldNotProcess).toBe(true);
    expect(exportMap["broken.py"].exportStatements).toEqual([]);
  });

  it("should throw an error for completely unknown file types", () => {
    expect(() => getExportExtractor("unknown.xyz")).toThrow(
      UnsupportedExtensionForExportExtractorError,
    );
  });

  it("should extract functions, classes, and assignments together", () => {
    const files = [
      {
        path: "combined.py",
        code: `
def my_function(): pass
class MyClass: pass
MY_CONSTANT = 42
        `.trim(),
      },
    ];

    const exportMap = generateExportMap(files);

    expect(exportMap).toHaveProperty("combined.py");
    expect(exportMap["combined.py"].language).toBe(Python.name);
    expect(exportMap["combined.py"].couldNotProcess).toBe(false);
    expect(exportMap["combined.py"].exportStatements.length).toBe(3);

    const [funcExport, classExport, constExport] =
      exportMap["combined.py"].exportStatements;

    expect(funcExport.members[0].identifierNode.text).toBe("my_function");
    expect(classExport.members[0].identifierNode.text).toBe("MyClass");
    expect(constExport.members[0].identifierNode.text).toBe("MY_CONSTANT");
  });
});
