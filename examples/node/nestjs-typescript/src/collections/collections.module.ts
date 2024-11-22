import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

// @nanoapi path:/api/v1/collections
@Module({
  imports: [],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
