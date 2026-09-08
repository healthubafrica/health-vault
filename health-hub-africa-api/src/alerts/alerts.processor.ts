import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AlertsService, ALERTS_QUEUE } from './alerts.service';

@Processor(ALERTS_QUEUE)
export class AlertsProcessor {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(private readonly alerts: AlertsService) {}

  @Process({ name: 'check-alerts' })
  async handleCheckAlerts() {
    try {
      await this.alerts.runChecks();
    } catch (err) {
      this.logger.error(`Alert check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
