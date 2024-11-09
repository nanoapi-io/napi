import { describe, it, expect } from "vitest";
import Parser from "tree-sitter";
import Typescript from "tree-sitter-typescript";
import { getTypescriptImports } from "./imports";

describe("Should extract imports identifiers from the source code", () => {
  it("Should extract import specifier", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
import { type Controller, Get } from '@nestjs/common';
import { type test1, test2 } from './test';
    `);

    const imports = getTypescriptImports(parser, tree.rootNode);

    expect(imports.length).toBe(2);

    expect(imports[0].source).toBe("@nestjs/common");
    expect(imports[0].importIdentifier).toBe(undefined);
    expect(imports[0].importSpecifierIdentifiers.length).toBe(2);
    expect(imports[0].importSpecifierIdentifiers[0].text).toBe("Controller");
    expect(imports[0].importSpecifierIdentifiers[1].text).toBe("Get");

    expect(imports[1].source).toBe("./test");
    expect(imports[1].importIdentifier).toBe(undefined);
    expect(imports[1].importSpecifierIdentifiers.length).toBe(2);
    expect(imports[1].importSpecifierIdentifiers[0].text).toBe("test1");
    expect(imports[1].importSpecifierIdentifiers[1].text).toBe("test2");
  });

  it("Should extract import identifier", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
import common from '@nestjs/common';
import * as test from './test';
`);

    const imports = getTypescriptImports(parser, tree.rootNode);

    expect(imports.length).toBe(2);

    expect(imports[0].source).toBe("@nestjs/common");
    expect(imports[0].importIdentifier).not.toBe(undefined);
    expect(imports[0].importIdentifier?.text).toBe("common");
    expect(imports[0].namespaceImport).toBe(undefined);
    expect(imports[0].importSpecifierIdentifiers.length).toBe(0);

    expect(imports[1].source).toBe("./test");
    expect(imports[1].importIdentifier).toBe(undefined);
    expect(imports[1].namespaceImport).not.toBe(undefined);
    expect(imports[1].namespaceImport?.text).toBe("test");
    expect(imports[1].importSpecifierIdentifiers.length).toBe(0);
  });

  it("Should work with require import", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
const { type test1, test2 } = require('@nestjs/common');
const test = require('./test');
`);

    const imports = getTypescriptImports(parser, tree.rootNode);

    expect(imports.length).toBe(2);

    expect(imports[0].source).toBe("@nestjs/common");
    expect(imports[0].importIdentifier).toBe(undefined);
    expect(imports[0].importSpecifierIdentifiers.length).toBe(2);
    expect(imports[0].importSpecifierIdentifiers[0].text).toBe("test1");
    expect(imports[0].importSpecifierIdentifiers[1].text).toBe("test2");

    expect(imports[1].source).toBe("./test");
    expect(imports[1].importIdentifier).not.toBe(undefined);
    expect(imports[1].importIdentifier?.text).toBe("test");
    expect(imports[1].importSpecifierIdentifiers.length).toBe(0);
  });

  it("Should work with dynamic import", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
const { type test1, test2 } = import('@nestjs/common');
const test = import('./test');
`);

    const imports = getTypescriptImports(parser, tree.rootNode);

    expect(imports.length).toBe(2);

    expect(imports[0].source).toBe("@nestjs/common");
    expect(imports[0].importIdentifier).toBe(undefined);
    expect(imports[0].importSpecifierIdentifiers.length).toBe(2);
    expect(imports[0].importSpecifierIdentifiers[0].text).toBe("test1");
    expect(imports[0].importSpecifierIdentifiers[1].text).toBe("test2");

    expect(imports[1].source).toBe("./test");
    expect(imports[1].importIdentifier).not.toBe(undefined);
    expect(imports[1].importIdentifier?.text).toBe("test");
    expect(imports[1].importSpecifierIdentifiers.length).toBe(0);
  });
});
