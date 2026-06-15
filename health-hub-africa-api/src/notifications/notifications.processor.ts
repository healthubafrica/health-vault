import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Resend } from 'resend';
import { NOTIFICATIONS_QUEUE, NotificationJobData } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly isProd: boolean;

  constructor(private readonly config: ConfigService) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  @Process({ name: 'send-email', concurrency: 5 })
  async handleEmail(job: Job<NotificationJobData>) {
    const { to, subject, body } = job.data;
    this.logger.log(`Sending email to ${to}: ${subject}`);
    // Never log message bodies in production — they contain OTP codes and PHI
    // and would end up in CloudWatch Logs.
    if (!this.isProd) {
      this.logger.log(`[DEV ONLY] Email Body: ${body}`);
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>(
      'RESEND_FROM',
      'MyHealth Vault+ <noreply@healthhubafrica.com>',
    );

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email');
      return;
    }

    const resend = new Resend(apiKey);

    const isOtp = subject?.toLowerCase().includes('otp') || subject?.toLowerCase().includes('verify');
    const html = isOtp ? buildOtpHtml(subject ?? '', body) : buildGenericHtml(subject ?? '', body);

    const { error } = await resend.emails.send({
      from,
      to,
      subject: subject ?? 'MyHealth Vault+™',
      html,
      text: body,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(`Email sent via Resend to ${to}`);
  }

  @Process({ name: 'send-sms', concurrency: 5 })
  async handleSms(job: Job<NotificationJobData>) {
    const { to, body } = job.data;
    this.logger.log(
      this.isProd ? `Sending SMS to ${to}` : `Sending SMS to ${to}: ${body}`,
    );

    const username = this.config.get<string>('AT_USERNAME');
    const apiKey = this.config.get<string>('AT_API_KEY');
    const senderId = this.config.get<string>('AT_SENDER_ID');

    if (!username || !apiKey) {
      this.logger.warn("Africa's Talking not configured — skipping SMS");
      return;
    }

    const isSandbox = username.toLowerCase() === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com';

    const params: Record<string, string> = {
      username,
      phoneNumbers: to,
      message: body,
    };

    if (senderId) {
      params.senderId = senderId;
    }

    const res = await fetch(`${baseUrl}/version1/messaging/bulk`, {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(params),
    });

    if (!res.ok) {
      throw new Error(`Africa's Talking error ${res.status}: ${await res.text()}`);
    }

    const responseData = await res.json();
    this.logger.log(`SMS sent successfully to ${to}. Response: ${JSON.stringify(responseData)}`);
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

// ── Email HTML helpers ────────────────────────────────────────────────────────

// Escape user-controlled strings before embedding in HTML to prevent injection.
// `content` passed to emailShell is trusted (built by this module), but every
// value that originates from a queue job (subject, body, otp) must be escaped
// before interpolation.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MyHealth Vault+™</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#0E4A30;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
                MyHealth Vault+™
              </p>
              <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#a8d5b5;letter-spacing:1px;text-transform:uppercase;">
                Health Hub Africa
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F4F6F5;padding:20px 40px;border-top:1px solid #EBEFEF;">
              <p style="margin:0;font-size:11px;color:#A0A0A0;line-height:1.6;">
                This email was sent by Health Hub Africa. If you did not request it, you can safely ignore it.
                <br/>Your data is protected under our
                <a href="https://healthhubafrica.com/privacy" style="color:#137333;text-decoration:none;">Privacy Policy</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOtpHtml(subject: string, body: string): string {
  // Extract and validate 6-digit OTP — digits only, never raw user input in HTML
  const otpMatch = body.match(/\b(\d{6})\b/);
  const otp = otpMatch?.[1];
  const safeOtp = otp && /^\d{6}$/.test(otp) ? otp : null;

  const otpBlock = safeOtp
    ? `<div style="margin:28px 0;text-align:center;">
         <div style="display:inline-block;background:#EBF5EC;border:2px solid #137333;border-radius:16px;padding:20px 40px;">
           <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#0E4A30;font-family:'Courier New',monospace;">${safeOtp}</p>
         </div>
       </div>
       <p style="margin:0 0 8px;font-size:13px;color:#6B6B6B;text-align:center;">
         This code expires in <strong style="color:#1A1A1A;">10 minutes</strong>.
       </p>`
    : `<p style="margin:0 0 20px;font-size:15px;color:#1A1A1A;line-height:1.7;">${escapeHtml(body)}</p>`;

  const isReset = subject.toLowerCase().includes('reset');

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1A1A1A;">
      ${isReset ? 'Reset your password' : 'Verify your email'}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;">
      ${isReset
        ? 'Use the code below to reset your MyHealth Vault+™ password.'
        : 'Enter the code below to verify your email and activate your account.'}
    </p>
    ${otpBlock}
    <p style="margin:20px 0 0;font-size:12px;color:#A0A0A0;">
      Never share this code with anyone. Health Hub Africa will never ask for it.
    </p>`;

  return emailShell(content);
}

function buildGenericHtml(subject: string, body: string): string {
  const paragraphs = body
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 16px;font-size:14px;color:#1A1A1A;line-height:1.7;">${escapeHtml(l)}</p>`)
    .join('');

  const content = `
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#1A1A1A;">${escapeHtml(subject)}</h1>
    ${paragraphs}`;

  return emailShell(content);
}
