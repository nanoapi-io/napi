import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
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

  // We want to simulate a long running operation which uses CPU.
  // So here is an implementation of a Fibonacci sequence calculator with inefficiencies.
  // It will be called from the generate-report endpoint to simulate a big report.
  async calculateHighFibonacci(number: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./dist/comics/comics.worker.js');
      worker.postMessage(number);
  
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
}
