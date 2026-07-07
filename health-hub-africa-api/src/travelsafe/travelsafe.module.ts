import { Module } from '@nestjs/common';
import { TravelsafeService } from './travelsafe.service';
import { TravelsafeController } from './travelsafe.controller';

@Module({
  providers: [TravelsafeService],
  controllers: [TravelsafeController],
  exports: [TravelsafeService],
})
export class TravelsafeModule {}
