import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { OpenemrModule } from '../openemr/openemr.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [OpenemrModule, StorageModule],
  providers: [RecordsService],
  controllers: [RecordsController],
  exports: [RecordsService],
})
export class RecordsModule {}
