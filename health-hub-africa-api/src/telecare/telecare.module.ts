import { Module } from '@nestjs/common';
import { TelecareService } from './telecare.service';
import { TelecareController } from './telecare.controller';

@Module({
  providers: [TelecareService],
  controllers: [TelecareController],
  exports: [TelecareService],
})
export class TelecareModule {}
