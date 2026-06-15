import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { OpenemrModule } from '../openemr/openemr.module';

@Module({
  imports: [OpenemrModule],
  providers: [ProvidersService],
  controllers: [ProvidersController],
  exports: [ProvidersService],
})
export class ProvidersModule {}
