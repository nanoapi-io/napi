import { describe, it, expect } from "vitest";
import Parser from "tree-sitter";
import Javascript from "tree-sitter-javascript";
import { getJavascriptExports } from "./exports";

describe("Should extract export from the source code", () => {
  it("Should extract named export with decorator", () => {
    const parser = new Parser();
    parser.setLanguage(Javascript);

    const tree = parser.parse(`
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly appService) {}

  // @nanoapi method:GET path:/
  @Get()
  getHello() {
    return this.appService.getHello();
  }

  // @nanoapi method:GET path:/liveness
  @Get('/liveness')
  getLiveness() {
    return 'OK';
  }

  // @nanoapi method:GET path:/readiness
  @Get('/readiness')
  async getReadiness(@Res() res) {
    // const isDbConnected = await this.prisma.checkDatabaseConnection();
    // if (isDbConnected) {
    //   return res.status(HttpStatus.OK).json({ status: 'ok', database: 'up' });
    // } else {
    //   return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', database: 'down' });
    // }
    return res.status(HttpStatus.OK).json({ status: 'ok' });
  }
}
    `);

    const exportNodes = getJavascriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).toBe(undefined);

    expect(exportNodes.namedExports.length).toBe(1);
    expect(exportNodes.namedExports[0].exportNode.text).toBe(`AppController`);
  });

  it("Should extract multiple named exports of different types", () => {
    const parser = new Parser();
    parser.setLanguage(Javascript);

    const tree = parser.parse(`
export function a() {
  return 1;
}

export class b {};

export const c = 1;

export let d = 1;

export var e = 1;
    `);

    const exportNodes = getJavascriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).toBe(undefined);

    expect(exportNodes.namedExports.length).toBe(5);
    expect(exportNodes.namedExports[0].exportNode.text).toBe("a");
    expect(exportNodes.namedExports[1].exportNode.text).toBe("b");
    expect(exportNodes.namedExports[2].exportNode.text).toBe("c");
    expect(exportNodes.namedExports[3].exportNode.text).toBe("d");
    expect(exportNodes.namedExports[4].exportNode.text).toBe("e");
  });

  it("Should extract default export", () => {
    const parser = new Parser();
    parser.setLanguage(Javascript);

    const tree = parser.parse(`
export default function a() {
    return 1;
}
    `);

    const exportNodes = getJavascriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).not.toBe(undefined);
    expect(exportNodes.defaultExport?.text).toBe(`export default function a() {
    return 1;
}`);
  });
});
