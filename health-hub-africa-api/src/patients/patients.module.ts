import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { OpenemrModule } from '../openemr/openemr.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [NotificationsModule, OpenemrModule, StorageModule],
  providers: [PatientsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
