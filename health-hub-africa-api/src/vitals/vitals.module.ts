import { Module } from '@nestjs/common';
import { VitalsService } from './vitals.service';
import { VitalsController } from './vitals.controller';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [OpenemrModule],
  providers: [VitalsService],
  controllers: [VitalsController],
  exports: [VitalsService],
})
export class VitalsModule {}
