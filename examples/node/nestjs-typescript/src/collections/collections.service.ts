import { Injectable } from '@nestjs/common';
import def, { create, getAll, getByUserId, update, deleteCollection, getRandomCollection, CollectionPartial } from './collections.data';
// import def from './collections.data';
import { Collection } from './collections.data';

console.log(def)
@Injectable()
export class CollectionsService {
  createCollection(data: CollectionPartial): Collection {
    const collection = create(data);
    return collection;
  }

  findAllCollections(): Collection[] {
    const collections = getAll();
    return collections;
  }

  findCollectionsByUser(userId: number): Collection[] {
    const collections = getByUserId(userId);
    return collections;
  }

  updateCollection(id: number, collection: CollectionPartial): Collection {
    return update(id, collection);
  }

  deleteCollection(collectionId: number) {
    deleteCollection(collectionId);
    return null
  }

  findRandomCollection() {
    const collection = getRandomCollection();
    return collection;
  }
}
