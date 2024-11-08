import { describe, it, expect } from "vitest";
import Parser from "tree-sitter";
import Typescript from "tree-sitter-typescript";
import { getTypescriptExports } from "./exports";

describe("Should extract export from the source code", () => {
  it("Should extract named export with decorator", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @nanoapi method:GET path:/
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // @nanoapi method:GET path:/liveness
  @Get('/liveness')
  getLiveness(): string {
    return 'OK';
  }

  // @nanoapi method:GET path:/readiness
  @Get('/readiness')
  async getReadiness(@Res() res: Response): Promise<Response> {
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

    const exportNodes = getTypescriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).toBe(undefined);

    expect(exportNodes.namedExports.length).toBe(1);
    expect(exportNodes.namedExports[0].exportNode.text).toBe(`AppController`);
  });

  it("Should extract multiple named exports of different types", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
export function a(): number {
  return 1;
}

export class b {};

export const c: number = 1;

export let d: number = 1;

export var e: number = 1;

export type f = number;
    `);

    const exportNodes = getTypescriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).toBe(undefined);

    expect(exportNodes.namedExports.length).toBe(6);
    expect(exportNodes.namedExports[0].exportNode.text).toBe("a");
    expect(exportNodes.namedExports[1].exportNode.text).toBe("b");
    expect(exportNodes.namedExports[2].exportNode.text).toBe("c");
    expect(exportNodes.namedExports[3].exportNode.text).toBe("d");
    expect(exportNodes.namedExports[4].exportNode.text).toBe("e");
    expect(exportNodes.namedExports[5].exportNode.text).toBe("f");
  });

  it("Should extract default export", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const tree = parser.parse(`
export default function a(): number {
    return 1;
}
    `);

    const exportNodes = getTypescriptExports(parser, tree.rootNode);

    expect(exportNodes.defaultExport).not.toBe(undefined);
    expect(exportNodes.defaultExport?.text)
      .toBe(`export default function a(): number {
    return 1;
}`);
  });
});
