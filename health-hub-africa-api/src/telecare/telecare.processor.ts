import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { TelecareService, TELECARE_QUEUE } from './telecare.service';

@Processor(TELECARE_QUEUE)
export class TelecareProcessor {
  private readonly logger = new Logger(TelecareProcessor.name);

  constructor(private readonly telecare: TelecareService) {}

  @Process({ name: 'sweep-stale-active' })
  async handleSweepStaleActive() {
    try {
      await this.telecare.sweepStaleActiveSessions();
    } catch (err) {
      this.logger.error(
        `Telecare sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
