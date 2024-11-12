import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { Collection, CollectionPartial } from './collections.data';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // @nanoapi path:/api/v1/collections/ method:POST
  @Post()
  async createCollection(
    @Body() collectionData: CollectionPartial
    ): Promise<Collection> {
    return this.collectionsService.createCollection(collectionData);
  }

  // @nanoapi path:/api/v1/collections/ method:GET
  @Get()
  async findAllCollections(): Promise<Collection[]> {
    return this.collectionsService.findAllCollections();
  }

  // @nanoapi path:/api/v1/collections/random/ method:GET
  @Get('/random')
  async findRandomCollection(): Promise<Collection | { id: number, name: string }> {
    return this.collectionsService.findRandomCollection();
  }

  // @nanoapi path:/api/v1/collections/:userId/ method:GET
  @Get('/user/:userId')
  async findCollectionsByUser(@Param('userId') userId: string): Promise<Collection[]> {
    return this.collectionsService.findCollectionsByUser(Number(userId));
  }

  // @nanoapi path:/api/v1/collections/:id/ method:GET
  @Put(':id')
  async updateCollection(
    @Param('id') id: number,
    @Body() collectionData: CollectionPartial,
  ): Promise<Collection> {
    return this.collectionsService.updateCollection(id, collectionData);
  }

  // @nanoapi path:/api/v1/collections/:id/ method:DELETE
  @Delete(':id')
  async deleteCollection(@Param('id') id: number): Promise<null> {
    return this.collectionsService.deleteCollection(id);
  }
}
