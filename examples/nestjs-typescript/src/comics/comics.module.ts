import { Module } from '@nestjs/common';
import { ComicsController } from './comics.controller';
import { ComicsService } from './comics.service';

// @nanoapi path:/api/v1/comics
@Module({
  imports: [],
  controllers: [ComicsController],
  providers: [ComicsService],
})
export class ComicsModule {}
