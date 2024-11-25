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
import { calculateHighFibonacci } from '../helpers/fibonacci';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  // @nanoapi method:POST path:/api/v1/comics/ group:comics-write
  @Post()
  async createComic(
    @Body() comicData: ComicPartial,
  ): Promise<Comic> {
    return this.comicsService.createComic(comicData);
  }

  // @nanoapi method:GET path:/api/v1/comics/ group:comics-read
  @Get()
  async findAllComics(): Promise<Comic[]> {
    return this.comicsService.findAllComics();
  }

  // @nanoapi method:GET path:/api/v1/comics/random/ group:comics-read
  @Get('/random')
  async findRandomComic(): Promise<Comic> {
    return this.comicsService.findRandomComic();
  }

  // @nanoapi method:GET path:/api/v1/comics/:id/ group:comics-read
  @Get('/user/:userId')
  async findComicsByUser(@Param('userId') userId: number): Promise<Comic[]> {
    return this.comicsService.findComicsByUser(userId);
  }

  // @nanoapi method:PUT path:/api/v1/comics/:id/ group:comics-write
  @Put(':id')
  async updateComic(
    @Param('id') id: number,
    @Body() comicData: ComicPartial,
  ): Promise<Comic> {
    return this.comicsService.updateComic(id, comicData);
  }

  // @nanoapi method:DELETE path:/api/v1/comics/:id/ group:comics-write
  @Delete(':id')
  async deleteComic(@Param('id') id: number): Promise<Comic> {
    return this.comicsService.deleteComic(id);
  }

  // @nanoapi method:GET path:/api/v1/comics/generate-report/:number/ group:comics-report
  @Get('/generate-report/:number')
  async calculateFibonacci(@Param('number') number: string): Promise<string> {
    // Simulation of a long running CPU bound operation
    const result = await calculateHighFibonacci(
      Number(number),
    );
    return `Fibonacci result for ${number} is ${result}`;
  }
}
