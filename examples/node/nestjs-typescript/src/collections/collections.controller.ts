import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { Collection, CollectionPartial } from './collections.data';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // @nanoapi method:POST path:/api/v1/collections/ group:collections-write
  @Post()
  async createCollection(
    @Body() collectionData: CollectionPartial
    ): Promise<Collection> {
    return this.collectionsService.createCollection(collectionData);
  }

  // @nanoapi method:GET path:/api/v1/collections/ group:collections-read
  @Get()
  async findAllCollections(): Promise<Collection[]> {
    return this.collectionsService.findAllCollections();
  }

  // @nanoapi method:GET path:/api/v1/collections/random/ group:collections-read
  @Get('/random')
  async findRandomCollection(): Promise<Collection | { id: number, name: string }> {
    return this.collectionsService.findRandomCollection();
  }

  // @nanoapi method:GET path:/api/v1/collections/user/:userId/ group:collections-read
  @Get('/user/:userId')
  async findCollectionsByUser(@Param('userId') userId: string): Promise<Collection[]> {
    return this.collectionsService.findCollectionsByUser(Number(userId));
  }

  // @nanoapi method:GET path:/api/v1/collections/:id/ group:collections-read
  @Put(':id')
  async updateCollection(
    @Param('id') id: number,
    @Body() collectionData: CollectionPartial,
  ): Promise<Collection> {
    return this.collectionsService.updateCollection(id, collectionData);
  }

  // @nanoapi method:DELETE path:/api/v1/collections/:id/ group:collections-write
  @Delete(':id')
  async deleteCollection(@Param('id') id: number): Promise<null> {
    return this.collectionsService.deleteCollection(id);
  }
}
