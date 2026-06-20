import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { OPENEMR_SYNC_QUEUE } from '../openemr/openemr.service';

@Module({
  imports: [BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE })],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
