import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { OpenemrModule } from '../openemr/openemr.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [OpenemrModule, StorageModule],
  providers: [ProvidersService],
  controllers: [ProvidersController],
  exports: [ProvidersService],
})
export class ProvidersModule {}
