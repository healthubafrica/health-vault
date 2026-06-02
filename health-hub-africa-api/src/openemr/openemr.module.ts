import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OpenemrService, OPENEMR_SYNC_QUEUE } from './openemr.service';
import { OpenemrController } from './openemr.controller';
import { OpenemrProcessor } from './openemr.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE }),
  ],
  providers: [OpenemrService, OpenemrProcessor],
  controllers: [OpenemrController],
  exports: [OpenemrService],
})
export class OpenemrModule {}
