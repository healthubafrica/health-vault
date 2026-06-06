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

    const apiKey = this.config.get('MAILGUN_API_KEY');
    const domain = this.config.get('MAILGUN_DOMAIN');
    const fromEmail = this.config.get('MAILGUN_FROM', 'noreply@healthhubafrica.com');

    if (!apiKey || !domain) {
      this.logger.warn('Mailgun not configured — skipping email');
      return;
    }

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: fromEmail,
        to,
        subject: subject ?? 'Health Hub Africa',
        text: body,
      }),
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

  // FCM HTTP v1 API (replaces legacy fcm/send — shut down June 2024)
  @Process({ name: 'send-push', concurrency: 10 })
  async handlePush(job: Job<NotificationJobData>) {
    const { to, subject, body } = job.data;
    this.logger.log(`Sending push to ${to.substring(0, 20)}...`);

    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase not configured — skipping push');
      return;
    }

    const accessToken = await this.getFcmAccessToken(clientEmail, privateKey);

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: to,
            notification: { title: subject ?? 'Health Hub Africa', body },
          },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`FCM v1 error ${res.status}: ${await res.text()}`);
    }

    this.logger.log(`Push sent to ${to.substring(0, 20)}...`);
  }

  // Generate a short-lived OAuth2 access token from the Firebase service account
  private async getFcmAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const scope = 'https://www.googleapis.com/auth/firebase.messaging';

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope,
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;

    // Sign with the private key using Node.js crypto
    const { createSign } = await import('crypto');
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(privateKey, 'base64url');

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`FCM token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    return tokenData.access_token;
  }
}
