import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
