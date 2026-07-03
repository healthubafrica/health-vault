import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsService,
  AppointmentNotificationData,
} from '../notifications/notifications.service';
import { APPOINTMENT_REMINDERS_QUEUE } from './appointments.service';

interface ReminderJobData {
  appointmentId: string;
  type: '24h' | '1h';
}

@Processor(APPOINTMENT_REMINDERS_QUEUE)
export class AppointmentReminderProcessor {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Process({ name: 'send-reminder', concurrency: 5 })
  async handleReminder(job: Job<ReminderJobData>) {
    const { appointmentId, type } = job.data;

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        hhaRef: true,
        serviceType: true,
        isTelecare: true,
        location: true,
        status: true,
        scheduledAt: true,
        durationMinutes: true,
        facility: { select: { name: true, city: true } },
        patient: {
          select: {
            firstName: true,
            userId: true,
            user: { select: { email: true, phone: true } },
          },
        },
        provider: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
            user: { select: { email: true, id: true } },
          },
        },
      },
    });

    // Skip if cancelled, completed, or missed by the time this fires
    const terminalStatuses: AppointmentStatus[] = [
      AppointmentStatus.cancelled,
      AppointmentStatus.completed,
      AppointmentStatus.no_show,
    ];
    if (!appt || terminalStatuses.includes(appt.status) || !appt.patient?.user?.email) {
      this.logger.log(`Skipping ${type} reminder for appointment ${appointmentId} — status: ${appt?.status ?? 'not found'}`);
      return;
    }

    const when = appt.scheduledAt.toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
    }) + ' (WAT)';

    const providerName = appt.provider
      ? `${appt.provider.title} ${appt.provider.firstName} ${appt.provider.lastName}`
      : null;

    const locationLine = appt.isTelecare
      ? 'Join from your Health Hub Africa portal a few minutes before the start time.'
      : appt.facility
        ? `${appt.facility.name}${appt.facility.city ? `, ${appt.facility.city}` : ''}`
        : appt.location ?? null;

    const timeLabel = type === '24h' ? 'tomorrow' : 'in about 1 hour';
    const hhaRef = appt.hhaRef;

    const baseData = {
      hhaRef,
      serviceType: appt.serviceType,
      when,
      durationMinutes: appt.durationMinutes,
      isVirtual: appt.isTelecare,
      providerName,
      locationLine,
      cancelReason: null,
    };

    // Patient reminder
    const patientData: AppointmentNotificationData = {
      ...baseData,
      recipientName: appt.patient.firstName,
      intro: `This is a reminder that your appointment is ${timeLabel}.`,
      outro: appt.isTelecare
        ? 'Please join the consultation from your Health Hub Africa portal at the scheduled time.'
        : 'Please arrive a few minutes early.',
    };
    const patientSubject = `Appointment reminder (${type === '24h' ? '24 hours' : '1 hour'} away) — ${hhaRef}`;

    await this.notifications.sendAppointmentEmail(
      appt.patient.user.email,
      patientSubject,
      appt.patient.userId,
      patientData,
    );
    if (appt.patient.user.phone) {
      const sms = `Health Hub Africa reminder: appointment ${hhaRef} with${providerName ? ` ${providerName}` : ''} is ${timeLabel} — ${when}.`;
      await this.notifications.sendSms(appt.patient.user.phone, sms, appt.patient.userId);
    }

    // Provider reminder (only if provider is assigned)
    if (appt.provider?.user?.email) {
      const providerData: AppointmentNotificationData = {
        ...baseData,
        recipientName: appt.provider.firstName,
        intro: `Reminder: you have an appointment ${timeLabel}.`,
        outro: 'View your full schedule in the Health Hub Africa provider portal.',
      };
      await this.notifications.sendAppointmentEmail(
        appt.provider.user.email,
        `Schedule reminder (${type === '24h' ? '24 hours' : '1 hour'} away) — ${hhaRef}`,
        appt.provider.user.id,
        providerData,
      );
    }

    this.logger.log(`Sent ${type} reminder for appointment ${appointmentId}`);
  }
}
