import { describe, it, expect } from "vitest";
import Parser from "tree-sitter";
import Typescript from "tree-sitter-typescript";
import { getTypescriptAnnotationNodes } from "./annotations";

describe("Should extract annotations from the source code", () => {
  it("Should extract final endpoints annotations", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const sourceCode = `
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
    `;

    const tree = parser.parse(sourceCode);

    const annotationsNodes = getTypescriptAnnotationNodes(
      parser,
      tree.rootNode,
    );

    expect(annotationsNodes.length).toBe(3);
    expect(annotationsNodes[0].text).toBe("// @nanoapi method:GET path:/");
    expect(annotationsNodes[1].text).toBe(
      "// @nanoapi method:GET path:/liveness",
    );
    expect(annotationsNodes[2].text).toBe(
      "// @nanoapi method:GET path:/readiness",
    );
  });

  it("Should extract group annotations", () => {
    const parser = new Parser();
    parser.setLanguage(Typescript.typescript);

    const sourceCode = `
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Character, CharacterSchema } from './characters.schema';
import { FileService } from 'src/file.service';

// @nanoapi path:/api/v1/characters
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Character.name, schema: CharacterSchema },
    ]),
  ],
  controllers: [CharactersController],
  providers: [CharactersService, FileService],
  exports: [CharactersService],
})
export class CharactersModule {}

    `;

    const tree = parser.parse(sourceCode);

    const annotationsNodes = getTypescriptAnnotationNodes(
      parser,
      tree.rootNode,
    );

    expect(annotationsNodes.length).toBe(1);
    expect(annotationsNodes[0].text).toBe(
      "// @nanoapi path:/api/v1/characters",
    );
  });
});
