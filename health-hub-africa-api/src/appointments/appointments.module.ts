import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [OpenemrModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
