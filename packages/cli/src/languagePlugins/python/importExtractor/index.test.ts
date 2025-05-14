import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { PythonImportExtractor } from "./index.ts";
import {
  FROM_IMPORT_STATEMENT_TYPE,
  type ImportItem,
  NORMAL_IMPORT_STATEMENT_TYPE,
} from "./types.ts";
import { pythonParser } from "../../../helpers/treeSitter/parsers.ts";

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
    expect(firstImportStatement.type).toEqual(NORMAL_IMPORT_STATEMENT_TYPE);
    expect(firstImportStatement.node.text).toEqual("import os");
    expect(firstImportStatement.members).toHaveLength(1);

    const firstImportStatementMember = firstImportStatement.members[0];
    expect(firstImportStatementMember.isWildcardImport).toEqual(false);
    expect(firstImportStatementMember.items).toBeUndefined();
    expect(firstImportStatementMember.node.text).toEqual("os");
    expect(firstImportStatementMember.identifierNode.text).toEqual("os");
    expect(firstImportStatementMember.aliasNode).toBeUndefined();

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement.type).toEqual(NORMAL_IMPORT_STATEMENT_TYPE);
    expect(secondImportStatement.node.text).toEqual("import sys");
    expect(secondImportStatement.members).toHaveLength(1);

    const secondImportStatementMember = secondImportStatement.members[0];
    expect(secondImportStatementMember.isWildcardImport).toEqual(false);
    expect(secondImportStatementMember.items).toBeUndefined();
    expect(secondImportStatementMember.node.text).toEqual("sys");
    expect(secondImportStatementMember.identifierNode.text).toEqual("sys");
    expect(secondImportStatementMember.aliasNode).toBeUndefined();
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
    expect(importStatement.type).toEqual(NORMAL_IMPORT_STATEMENT_TYPE);
    expect(importStatement.members).toHaveLength(1);
    const importStatementMember = importStatement.members[0];
    expect(importStatementMember.isWildcardImport).toEqual(false);
    expect(importStatementMember.items).toBeUndefined();
    expect(importStatementMember.node.text).toEqual("os as operating_system");
    expect(importStatementMember.identifierNode.text).toEqual("os");
    expect(importStatementMember.aliasNode?.text).toEqual("operating_system");
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
    expect(firstImportStatement.type).toEqual(FROM_IMPORT_STATEMENT_TYPE);
    expect(firstImportStatement.node.text).toEqual(
      "from os import path, environ",
    );
    expect(firstImportStatement.members).toHaveLength(1);

    const firstImportStatementMember = firstImportStatement.members[0];
    expect(firstImportStatementMember.isWildcardImport).toEqual(false);
    expect(firstImportStatementMember.node.text).toEqual("os");
    expect(firstImportStatementMember.identifierNode.text).toEqual("os");
    expect(firstImportStatementMember.aliasNode).toBeUndefined();
    expect(firstImportStatementMember.items).toHaveLength(2);

    const firstImportStatementMemberFirstSymbol = (
      firstImportStatementMember.items as ImportItem[]
    )[0];
    expect(firstImportStatementMemberFirstSymbol.node.text).toEqual("path");
    expect(firstImportStatementMemberFirstSymbol.identifierNode.text).toEqual(
      "path",
    );
    expect(firstImportStatementMemberFirstSymbol.aliasNode).toBeUndefined();

    const firstImportStatementMemberSecondSymbol = (
      firstImportStatementMember.items as ImportItem[]
    )[1];
    expect(firstImportStatementMemberSecondSymbol.node.text).toEqual("environ");
    expect(firstImportStatementMemberSecondSymbol.identifierNode.text).toEqual(
      "environ",
    );
    expect(firstImportStatementMemberSecondSymbol.aliasNode).toBeUndefined();

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement.type).toEqual(FROM_IMPORT_STATEMENT_TYPE);
    expect(secondImportStatement.node.text).toEqual("from sys import argv");
    expect(secondImportStatement.members).toHaveLength(1);

    const secondImportStatementMember = secondImportStatement.members[0];
    expect(secondImportStatementMember.isWildcardImport).toEqual(false);
    expect(secondImportStatementMember.node.text).toEqual("sys");
    expect(secondImportStatementMember.identifierNode.text).toEqual("sys");
    expect(secondImportStatementMember.aliasNode).toBeUndefined();
    expect(secondImportStatementMember.items).toHaveLength(1);

    const secondImportStatementMemberSymbol = (
      secondImportStatementMember.items as ImportItem[]
    )[0];
    expect(secondImportStatementMemberSymbol.node.text).toEqual("argv");
    expect(secondImportStatementMemberSymbol.node.text).toEqual("argv");
    expect(secondImportStatementMemberSymbol.aliasNode).toBeUndefined();
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
    expect(importStatement.type).toEqual(FROM_IMPORT_STATEMENT_TYPE);
    expect(importStatement.node.text).toEqual(
      "from os import path as os_path",
    );
    expect(importStatement.members).toHaveLength(1);

    const importStatementMember = importStatement.members[0];
    expect(importStatementMember.isWildcardImport).toEqual(false);
    expect(importStatementMember.node.text).toEqual("os");
    expect(importStatementMember.identifierNode.text).toEqual("os");
    expect(importStatementMember.aliasNode).toBeUndefined();
    expect(importStatementMember.items).toHaveLength(1);

    const importStatementMemberSymbol = (
      importStatementMember.items as ImportItem[]
    )[0];
    expect(importStatementMemberSymbol.node.text).toEqual("path as os_path");
    expect(importStatementMemberSymbol.identifierNode.text).toEqual("path");
    expect(importStatementMemberSymbol.aliasNode?.text).toEqual("os_path");
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
    expect(importStatement.type).toEqual(FROM_IMPORT_STATEMENT_TYPE);
    expect(importStatement.node.text).toEqual("from os import *");
    expect(importStatement.members).toHaveLength(1);

    const importStatementMember = importStatement.members[0];
    expect(importStatementMember.isWildcardImport).toEqual(true);
    expect(importStatementMember.items).toBeUndefined();
    expect(importStatementMember.node.text).toEqual("os");
    expect(importStatementMember.identifierNode.text).toEqual("os");
    expect(importStatementMember.aliasNode).toBeUndefined();
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
    expect(firstImportStatement.type).toEqual(NORMAL_IMPORT_STATEMENT_TYPE);
    expect(firstImportStatement.node.text).toEqual("import os");
    expect(firstImportStatement.members).toHaveLength(1);

    const secondImportStatement = importStatements[1];
    expect(secondImportStatement.type).toEqual(FROM_IMPORT_STATEMENT_TYPE);
    expect(secondImportStatement.node.text).toEqual("from sys import argv");
    expect(secondImportStatement.members).toHaveLength(1);
  });
});
