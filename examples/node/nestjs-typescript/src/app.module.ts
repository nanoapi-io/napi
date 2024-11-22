import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ComicsModule } from './comics/comics.module';
import { CollectionsModule } from './collections/collections.module';

// @nanoapi path:/api/v1
@Module({
  imports: [ConfigModule.forRoot(), UsersModule, ComicsModule, CollectionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
