import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE, NotificationJobData, AppointmentNotificationData, ShareNotificationData } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly isProd: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  // Marks the delivery row as sent. Best-effort: a failure to update the
  // tracking row must never fail an otherwise-successful send.
  private async markSent(deliveryId: string): Promise<void> {
    await this.prisma.notificationDelivery
      .update({ where: { id: deliveryId }, data: { status: 'sent', sentAt: new Date() } })
      .catch((err) => this.logger.warn(`Failed to mark delivery ${deliveryId} sent: ${err.message}`));
  }

  // Marks the delivery row as skipped (channel not configured — retrying
  // won't help, so this is terminal without throwing/consuming a retry).
  private async markSkipped(deliveryId: string, reason: string): Promise<void> {
    await this.prisma.notificationDelivery
      .update({ where: { id: deliveryId }, data: { status: 'skipped', failedAt: new Date(), failureReason: reason } })
      .catch((err) => this.logger.warn(`Failed to mark delivery ${deliveryId} skipped: ${err.message}`));
  }

  // Marks the delivery row as failed. Bull will still retry per the job's
  // `attempts`/backoff config — only the final attempt is recorded as a
  // terminal 'failed'; earlier attempts are recorded as 'retrying' so the
  // admin panel doesn't show a permanent failure mid-retry-cycle.
  private async markFailed(deliveryId: string, job: Job<NotificationJobData>, err: unknown): Promise<void> {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const maxAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
    const isFinal = job.attemptsMade + 1 >= maxAttempts;
    await this.prisma.notificationDelivery
      .update({
        where: { id: deliveryId },
        data: {
          status: isFinal ? 'failed' : 'retrying',
          failedAt: isFinal ? new Date() : null,
          failureReason: message,
        },
      })
      .catch((e) => this.logger.warn(`Failed to mark delivery ${deliveryId} failed: ${e.message}`));
  }

  @Process({ name: 'send-email', concurrency: 5 })
  async handleEmail(job: Job<NotificationJobData>) {
    const { to, subject, body, deliveryId } = job.data;
    if (!this.isProd) this.logger.log(`[DEV ONLY] Email Body: ${body}`);
    const isOtp = subject?.toLowerCase().includes('otp') || subject?.toLowerCase().includes('verify');
    const html = isOtp ? buildOtpHtml(subject ?? '', body) : buildGenericHtml(subject ?? '', body);
    await this.sendEmailTracked(deliveryId, job, to, subject ?? 'MyHealth Vault+™', html, body);
  }

  @Process({ name: 'send-appointment-email', concurrency: 5 })
  async handleAppointmentEmail(job: Job<NotificationJobData>) {
    const { to, subject, body, metadata, deliveryId } = job.data;
    if (!this.isProd) this.logger.log(`[DEV ONLY] Appointment email to ${to}: ${subject}`);
    const apptData = metadata?.appt as AppointmentNotificationData | undefined;
    const html = apptData
      ? buildAppointmentHtml(subject ?? '', apptData)
      : buildGenericHtml(subject ?? '', body);
    await this.sendEmailTracked(deliveryId, job, to, subject ?? 'MyHealth Vault+™', html, body);
  }

  @Process({ name: 'send-share-notification-email', concurrency: 5 })
  async handleShareNotificationEmail(job: Job<NotificationJobData>) {
    const { to, subject, body, metadata, deliveryId } = job.data;
    if (!this.isProd) this.logger.log(`[DEV ONLY] Share notification email to ${to}: ${subject}`);
    const shareData = metadata?.share as ShareNotificationData | undefined;
    const html = shareData
      ? buildShareHtml(subject ?? '', shareData)
      : buildGenericHtml(subject ?? '', body);
    await this.sendEmailTracked(deliveryId, job, to, subject ?? 'MyHealth Vault+™', html, body);
  }

  // Shared wrapper: attempts the send, updates the delivery row, and
  // rethrows on failure so Bull's retry/backoff behavior is unaffected.
  private async sendEmailTracked(
    deliveryId: string,
    job: Job<NotificationJobData>,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      const skipped = await this.doSendEmail(to, subject, html, text);
      if (skipped) {
        await this.markSkipped(deliveryId, skipped);
        return;
      }
      await this.markSent(deliveryId);
    } catch (err) {
      await this.markFailed(deliveryId, job, err);
      throw err;
    }
  }

  // Returns a skip reason string when the provider isn't configured, or
  // undefined once the send has actually been attempted (success or throw).
  private async doSendEmail(to: string, subject: string, html: string, text: string): Promise<string | undefined> {
    this.logger.log(`Sending email to ${to}: ${subject}`);

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>(
      'RESEND_FROM',
      'MyHealth Vault+ <noreply@healthhubafrica.com>',
    );

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email');
      return 'Email provider not configured (RESEND_API_KEY missing)';
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) throw new Error(`Resend error: ${error.message}`);
    this.logger.log(`Email sent via Resend to ${to}`);
    return undefined;
  }

  @Process({ name: 'send-sms', concurrency: 5 })
  async handleSms(job: Job<NotificationJobData>) {
    const { to, body, deliveryId } = job.data;
    this.logger.log(
      this.isProd ? `Sending SMS to ${to}` : `Sending SMS to ${to}: ${body}`,
    );

    try {
      const username = this.config.get<string>('AT_USERNAME');
      const apiKey = this.config.get<string>('AT_API_KEY');
      const senderId = this.config.get<string>('AT_SENDER_ID');

      if (!username || !apiKey) {
        this.logger.warn("Africa's Talking not configured — skipping SMS");
        await this.markSkipped(deliveryId, "SMS provider not configured (AT_USERNAME/AT_API_KEY missing)");
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
      await this.markSent(deliveryId);
    } catch (err) {
      await this.markFailed(deliveryId, job, err);
      throw err;
    }
  }

  // FCM HTTP v1 API (replaces legacy fcm/send — shut down June 2024)
  @Process({ name: 'send-push', concurrency: 10 })
  async handlePush(job: Job<NotificationJobData>) {
    const { to, subject, body, deliveryId } = job.data;
    this.logger.log(`Sending push to ${to.substring(0, 20)}...`);

    try {
      const projectId = this.config.get('FIREBASE_PROJECT_ID');
      const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('Firebase not configured — skipping push');
        await this.markSkipped(deliveryId, 'Push provider not configured (Firebase credentials missing)');
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
      await this.markSent(deliveryId);
    } catch (err) {
      await this.markFailed(deliveryId, job, err);
      throw err;
    }
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

function buildShareHtml(_subject: string, d: ShareNotificationData): string {
  const docList = d.recordTypes.length
    ? d.recordTypes.map(t => `<li style="margin:4px 0;font-size:13px;color:#1A1A1A;">${escapeHtml(t)}</li>`).join('')
    : `<li style="margin:4px 0;font-size:13px;color:#1A1A1A;">General health records</li>`;

  const expiryLine = d.expiresAt
    ? escapeHtml(
        d.expiresAt.toLocaleString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
        }) + ' (WAT)',
      )
    : 'No expiry — sender can revoke at any time';

  const accessInstructions = d.accessMode === 'public'
    ? 'No verification required — the link is publicly accessible.'
    : d.accessMode === 'password'
      ? 'Open the link and enter the password provided by the sender.'
      : 'Open the link and enter your email address. A one-time code will be sent to you.';

  const labelLine = d.shareLabel
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0E4A30;letter-spacing:0.5px;text-transform:uppercase;">
        ${escapeHtml(d.shareLabel)}
       </p>`
    : '';

  const content = `
    <!-- Header badge -->
    <div style="display:inline-block;background:#E6F4F0;border-radius:20px;padding:6px 14px;margin-bottom:20px;">
      <span style="font-size:13px;font-weight:700;color:#0E4A30;">🔒&nbsp;&nbsp;Secure Health Record Share</span>
    </div>

    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1A1A1A;">
      ${escapeHtml(d.patientName)} shared records with you
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#3D3D3D;line-height:1.6;">
      You have been given secure access to health records via MyHealth Vault+™.
    </p>

    <!-- Record details card -->
    <div style="background:#F8FAFA;border:1.5px solid #E0EAED;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      ${labelLine}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B6B6B;width:130px;vertical-align:top;">Patient</td>
            <td style="padding:8px 0;font-size:13px;color:#1A1A1A;font-weight:600;">${escapeHtml(d.patientName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Documents</td>
            <td style="padding:8px 0;">
              <ul style="margin:0;padding-left:16px;">${docList}</ul>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Expires</td>
            <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${expiryLine}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Access</td>
            <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${escapeHtml(accessInstructions)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="margin:28px 0 20px;text-align:center;">
      <a href="${escapeHtml(d.shareUrl)}" style="display:inline-block;background:#0E4A30;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;">
        View shared records
      </a>
    </div>

    <!-- Security notices -->
    <div style="background:#FFF9E6;border-left:3px solid #B59410;border-radius:4px;padding:12px 16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#7A6200;">Security reminders</p>
      <ul style="margin:4px 0 0;padding-left:16px;">
        <li style="margin:2px 0;font-size:12px;color:#5A4A00;">This link is for <strong>${escapeHtml(d.recipientEmail)}</strong> only — do not forward it.</li>
        <li style="margin:2px 0;font-size:12px;color:#5A4A00;">Every access is logged and visible to the sender.</li>
        <li style="margin:2px 0;font-size:12px;color:#5A4A00;">The sender can revoke your access at any time.</li>
      </ul>
    </div>`;

  return emailShell(content);
}

function buildAppointmentHtml(subject: string, d: AppointmentNotificationData): string {
  const isCancelled = subject.toLowerCase().includes('cancel');
  const isReminder = subject.toLowerCase().includes('reminder');
  const isCompleted = subject.toLowerCase().includes('complete');
  const isNoShow = subject.toLowerCase().includes('missed');

  const accentColor = isCancelled || isNoShow ? '#C0392B' : isCompleted ? '#137333' : '#0E4A30';
  const badgeBg = isCancelled || isNoShow ? '#FDF0EE' : isCompleted ? '#EBF5EC' : '#E6F4F0';

  const statusIcon = isCancelled ? '✕' : isNoShow ? '✕' : isCompleted ? '✓' : isReminder ? '⏰' : '✓';
  const statusLabel = isCancelled ? 'Cancelled' : isNoShow ? 'Missed' : isCompleted ? 'Completed' : isReminder ? 'Reminder' : 'Confirmed';

  const detailRows: string[] = [
    `<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;width:120px;vertical-align:top;">Reference</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;font-weight:600;">${escapeHtml(d.hhaRef)}</td>
    </tr>`,
    `<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Service</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${escapeHtml(d.serviceType)}</td>
    </tr>`,
    `<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Date &amp; Time</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;font-weight:600;">${escapeHtml(d.when)}</td>
    </tr>`,
    `<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Duration</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${d.durationMinutes} minutes</td>
    </tr>`,
  ];

  if (d.providerName) {
    detailRows.push(`<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Provider</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${escapeHtml(d.providerName)}</td>
    </tr>`);
  }

  if (d.locationLine) {
    const label = d.isVirtual ? 'How to join' : 'Location';
    detailRows.push(`<tr>
      <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A1A;">${escapeHtml(d.locationLine)}</td>
    </tr>`);
  }

  const cancelBlock = d.cancelReason
    ? `<div style="margin:16px 0 0;padding:12px 16px;background:#FDF0EE;border-left:3px solid #C0392B;border-radius:4px;">
        <p style="margin:0;font-size:13px;color:#C0392B;font-weight:600;">Reason</p>
        <p style="margin:4px 0 0;font-size:13px;color:#4A1A1A;">${escapeHtml(d.cancelReason)}</p>
       </div>`
    : '';

  const outroBlock = d.outro
    ? `<p style="margin:20px 0 0;font-size:13px;color:#6B6B6B;line-height:1.6;">${escapeHtml(d.outro)}</p>`
    : '';

  const content = `
    <!-- Status badge -->
    <div style="display:inline-block;background:${badgeBg};border-radius:20px;padding:6px 14px;margin-bottom:20px;">
      <span style="font-size:13px;font-weight:700;color:${accentColor};">${statusIcon}&nbsp;&nbsp;${statusLabel}</span>
    </div>

    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1A1A1A;">
      Hi ${escapeHtml(d.recipientName)},
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#3D3D3D;line-height:1.6;">
      ${escapeHtml(d.intro)}
    </p>

    <!-- Appointment card -->
    <div style="background:#F8FAFA;border:1.5px solid #E0EAED;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tbody>
          ${detailRows.join('\n          ')}
        </tbody>
      </table>
      ${cancelBlock}
    </div>

    ${outroBlock}

    <!-- CTA -->
    <div style="margin:28px 0 0;text-align:center;">
      <a href="https://app.myvaultplus.com" style="display:inline-block;background:${accentColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;">
        Go to your portal
      </a>
    </div>`;

  return emailShell(content);
}
