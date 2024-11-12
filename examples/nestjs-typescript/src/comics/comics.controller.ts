import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ComicsService } from './comics.service';
import { Comic, ComicPartial } from './comics.data';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  // @nanoapi path:/api/v1/comics/ method:POST
  @Post()
  async createComic(
    @Body() comicData: ComicPartial,
  ): Promise<Comic> {
    return this.comicsService.createComic(comicData);
  }

  // @nanoapi path:/api/v1/comics/ method:GET
  @Get()
  async findAllComics(): Promise<Comic[]> {
    return this.comicsService.findAllComics();
  }

  // @nanoapi path:/api/v1/comics/random/ method:GET
  @Get('/random')
  async findRandomComic(): Promise<Comic> {
    return this.comicsService.findRandomComic();
  }

  // @nanoapi path:/api/v1/comics/:id/ method:GET
  @Get('/user/:userId')
  async findComicsByUser(@Param('userId') userId: number): Promise<Comic[]> {
    return this.comicsService.findComicsByUser(userId);
  }

  // @nanoapi path:/api/v1/comics/:id/ method:GET
  @Put(':id')
  async updateComic(
    @Param('id') id: number,
    @Body() comicData: ComicPartial,
  ): Promise<Comic> {
    return this.comicsService.updateComic(id, comicData);
  }

  // @nanoapi path:/api/v1/comics/:id/ method:DELETE
  @Delete(':id')
  async deleteComic(@Param('id') id: number): Promise<Comic> {
    return this.comicsService.deleteComic(id);
  }

  // @nanoapi path:/api/v1/comics/generate-report/:number/ method:GET
  @Get('/generate-report/:number')
  async calculateFibonacci(@Param('number') number: string): Promise<string> {
    // Simulation of a long running CPU bound operation
    const result = await this.comicsService.calculateHighFibonacci(
      Number(number),
    );
    return `Fibonacci result for ${number} is ${result}`;
  }
}
