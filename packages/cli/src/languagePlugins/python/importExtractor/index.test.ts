import { describe, expect, test } from "vitest";
import {
  ImportItem,
  FROM_IMPORT_STATEMENT_TYPE,
  NORMAL_IMPORT_STATEMENT_TYPE,
  PythonImportExtractor,
} from ".";
import { pythonParser } from "../../../helpers/treeSitter/parsers";

describe("Python Import Extractor", () => {
  const parser = pythonParser;

  test("should extract multiple simple normal import statements", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse(`
            import os
            import sys
            `).rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");
    expect(importStatements).toHaveLength(2);

    const firstImportStatement = importStatements[0];
    expect(firstImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "import os" }),
        type: NORMAL_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(firstImportStatement.members).toHaveLength(1);
    const firstImportStatementMember = firstImportStatement.members[0];
    expect(firstImportStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "os" }),
        identifierNode: expect.objectContaining({ text: "os" }),
        aliasNode: undefined,
        isWildcardImport: false,
        items: undefined,
      }),
    );

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "import sys" }),
        type: NORMAL_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(secondImportStatement.members).toHaveLength(1);
    const secondImportStatementMember = secondImportStatement.members[0];
    expect(secondImportStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "sys" }),
        identifierNode: expect.objectContaining({ text: "sys" }),
        aliasNode: undefined,
        isWildcardImport: false,
        items: undefined,
      }),
    );
  });

  test("should extract aliased normal import statements", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse("import os as operating_system").rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");
    expect(importStatements).toHaveLength(1);

    const importStatement = importStatements[0];
    expect(importStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          text: "import os as operating_system",
        }),
        type: NORMAL_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(importStatement.members).toHaveLength(1);
    const importStatementMember = importStatement.members[0];
    expect(importStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "os as operating_system" }),
        identifierNode: expect.objectContaining({ text: "os" }),
        aliasNode: expect.objectContaining({ text: "operating_system" }),
        isWildcardImport: false,
        items: undefined,
      }),
    );
  });

  test("should extract multilple from import statements", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse(`
            from os import path, environ
            from sys import argv
            `).rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");
    expect(importStatements).toHaveLength(2);

    const firstImportStatement = importStatements[0];
    expect(firstImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          text: "from os import path, environ",
        }),
        type: FROM_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(firstImportStatement.members).toHaveLength(1);
    const firstImportStatementMember = firstImportStatement.members[0];
    expect(firstImportStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "os" }),
        identifierNode: expect.objectContaining({ text: "os" }),
        aliasNode: undefined,
        isWildcardImport: false,
      }),
    );
    expect(firstImportStatementMember.items).toHaveLength(2);
    const firstImportStatementMemberFirstSymbol = (
      firstImportStatementMember.items as ImportItem[]
    )[0];
    expect(firstImportStatementMemberFirstSymbol).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "path" }),
        identifierNode: expect.objectContaining({ text: "path" }),
        aliasNode: undefined,
      }),
    );
    const firstImportStatementMemberSecondSymbol = (
      firstImportStatementMember.items as ImportItem[]
    )[1];
    expect(firstImportStatementMemberSecondSymbol).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "environ" }),
        identifierNode: expect.objectContaining({ text: "environ" }),
        aliasNode: undefined,
      }),
    );

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          text: "from sys import argv",
        }),
        type: FROM_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(secondImportStatement.members).toHaveLength(1);
    const secondImportStatementMember = secondImportStatement.members[0];
    expect(secondImportStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "sys" }),
        identifierNode: expect.objectContaining({ text: "sys" }),
        aliasNode: undefined,
        isWildcardImport: false,
      }),
    );
    expect(secondImportStatementMember.items).toHaveLength(1);
    const secondImportStatementMemberSymbol = (
      secondImportStatementMember.items as ImportItem[]
    )[0];
    expect(secondImportStatementMemberSymbol).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "argv" }),
        identifierNode: expect.objectContaining({ text: "argv" }),
        aliasNode: undefined,
      }),
    );
  });

  test("should extract from import statements with aliases", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse("from os import path as os_path").rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");

    expect(importStatements).toHaveLength(1);

    const importStatement = importStatements[0];
    expect(importStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          text: "from os import path as os_path",
        }),
        type: FROM_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(importStatement.members).toHaveLength(1);
    const importStatementMember = importStatement.members[0];
    expect(importStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "os" }),
        identifierNode: expect.objectContaining({ text: "os" }),
        aliasNode: undefined,
        isWildcardImport: false,
      }),
    );
    // the except below fails. importStatementMember.items is undefined
    expect(importStatementMember.items).toHaveLength(1);
    const importStatementMemberSymbol = (
      importStatementMember.items as ImportItem[]
    )[0];
    expect(importStatementMemberSymbol).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "path as os_path" }),
        identifierNode: expect.objectContaining({ text: "path" }),
        aliasNode: expect.objectContaining({ text: "os_path" }),
      }),
    );
  });

  test("should extract from import statements with wildcard imports", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse("from os import *").rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");

    expect(importStatements).toHaveLength(1);

    const importStatement = importStatements[0];
    expect(importStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "from os import *" }),
        type: FROM_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(importStatement.members).toHaveLength(1);
    const importStatementMember = importStatement.members[0];
    expect(importStatementMember).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "os" }),
        identifierNode: expect.objectContaining({ text: "os" }),
        aliasNode: undefined,
        isWildcardImport: true,
        items: undefined,
      }),
    );
  });

  test("should handle mix of normal and from import statements", () => {
    const importExtractor = new PythonImportExtractor(
      parser,
      new Map([
        [
          "file.py",
          {
            path: "file.py",
            rootNode: parser.parse(`
            import os
            from sys import argv
            `).rootNode,
          },
        ],
      ]),
    );

    const importStatements = importExtractor.getImportStatements("file.py");
    expect(importStatements).toHaveLength(2);

    const firstImportStatement = importStatements[0];
    expect(firstImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "import os" }),
        type: NORMAL_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(firstImportStatement.members).toHaveLength(1);

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement).toEqual(
      expect.objectContaining({
        node: expect.objectContaining({ text: "from sys import argv" }),
        type: FROM_IMPORT_STATEMENT_TYPE,
      }),
    );
    expect(secondImportStatement.members).toHaveLength(1);
  });
});
