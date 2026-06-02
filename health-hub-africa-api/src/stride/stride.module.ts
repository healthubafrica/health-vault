import { Module } from '@nestjs/common';
import { StrideService } from './stride.service';
import { StrideController } from './stride.controller';

@Module({
  providers: [StrideService],
  controllers: [StrideController],
  exports: [StrideService],
})
export class StrideModule {}
