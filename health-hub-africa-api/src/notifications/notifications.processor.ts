import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { NOTIFICATIONS_QUEUE, NotificationJobData } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly config: ConfigService) {}

  @Process({ name: 'send-email', concurrency: 5 })
  async handleEmail(job: Job<NotificationJobData>) {
    const { to, subject, body } = job.data;
    this.logger.log(`Sending email to ${to}: ${subject}`);

    // Mailgun integration
    const apiKey = this.config.get('MAILGUN_API_KEY');
    const domain = this.config.get('MAILGUN_DOMAIN');
    const fromEmail = this.config.get('MAIL_FROM', 'noreply@healthhubafrica.com');

    if (!apiKey || !domain) {
      this.logger.warn('Mailgun not configured — skipping email');
      return;
    }

    const formData = new URLSearchParams({
      from: fromEmail,
      to,
      subject: subject ?? 'Health Hub Africa',
      text: body,
    });

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Mailgun error ${res.status}: ${await res.text()}`);
    }

    this.logger.log(`Email sent to ${to}`);
  }

  @Process({ name: 'send-sms', concurrency: 5 })
  async handleSms(job: Job<NotificationJobData>) {
    const { to, body } = job.data;
    this.logger.log(`Sending SMS to ${to}`);

    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('Twilio not configured — skipping SMS');
      return;
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
      },
    );

    if (!res.ok) {
      throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
    }
  }

  @Process({ name: 'send-push', concurrency: 10 })
  async handlePush(job: Job<NotificationJobData>) {
    const { to, subject, body } = job.data;
    this.logger.log(`Sending push to ${to.substring(0, 20)}...`);

    const firebaseKey = this.config.get('FIREBASE_SERVER_KEY');
    if (!firebaseKey) {
      this.logger.warn('Firebase not configured — skipping push');
      return;
    }

    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${firebaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        notification: { title: subject, body },
      }),
    });

    if (!res.ok) {
      throw new Error(`FCM error ${res.status}: ${await res.text()}`);
    }
  }
}
