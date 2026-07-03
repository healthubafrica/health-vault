import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppointmentsService, APPOINTMENT_REMINDERS_QUEUE } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentReminderProcessor } from './appointment-reminders.processor';
import { OpenemrModule } from '../openemr/openemr.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    OpenemrModule,
    NotificationsModule,
    BullModule.registerQueue({ name: APPOINTMENT_REMINDERS_QUEUE }),
  ],
  providers: [AppointmentsService, AppointmentReminderProcessor],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
