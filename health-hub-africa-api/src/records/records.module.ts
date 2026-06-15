import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [OpenemrModule],
  providers: [RecordsService],
  controllers: [RecordsController],
  exports: [RecordsService],
})
export class RecordsModule {}
