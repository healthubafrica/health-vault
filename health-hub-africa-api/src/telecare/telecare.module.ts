import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TelecareService, TELECARE_QUEUE } from './telecare.service';
import { TelecareController } from './telecare.controller';
import { TelecareProcessor } from './telecare.processor';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TELECARE_QUEUE,
    }),
    StorageModule,
  ],
  providers: [TelecareService, TelecareProcessor],
  controllers: [TelecareController],
  exports: [TelecareService],
})
export class TelecareModule {}
