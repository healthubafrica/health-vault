import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [NotificationsModule, OpenemrModule],
  providers: [PatientsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
