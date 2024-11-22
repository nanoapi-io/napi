import { Injectable } from '@nestjs/common';
import { Comic, ComicPartial, create, deleteComic, getAll, getByUserId, getRandomComic, update, } from './comics.data';

@Injectable()
export class ComicsService {
  async createComic(data: ComicPartial): Promise<Comic> {
    return create(data);
  }

  async findAllComics(): Promise<Comic[]> {
    return getAll();
  }

  async findComicsByUser(userId: number): Promise<Comic[]> {
    return getByUserId(userId);
  }

  async updateComic(id: number, comic: ComicPartial): Promise<Comic> {
    return update(id, comic);
  }

  async deleteComic(id: number): Promise<null> {
    deleteComic(id);
    return null
  }

  async findRandomComic(): Promise<Comic> {
    return getRandomComic()
  }
}
