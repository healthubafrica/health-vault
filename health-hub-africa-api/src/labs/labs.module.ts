import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [OpenemrModule],
  providers: [LabsService],
  controllers: [LabsController],
  exports: [LabsService],
})
export class LabsModule {}
