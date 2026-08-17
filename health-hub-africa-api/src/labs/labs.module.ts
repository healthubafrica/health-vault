import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { OpenemrModule } from '../openemr/openemr.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [OpenemrModule, NotificationsModule],
  providers: [LabsService],
  controllers: [LabsController],
  exports: [LabsService],
})
export class LabsModule {}
