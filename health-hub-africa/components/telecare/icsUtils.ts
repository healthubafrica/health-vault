// Generates a minimal .ics file client-side and triggers a download — no
// backend involved. Works with Google Calendar, Outlook, and Apple Calendar.

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
}

export function downloadTelecareInvite(opts: {
  hhaRef: string
  scheduledAt: string
  providerName?: string
  durationMinutes?: number
}) {
  const start = new Date(opts.scheduledAt)
  const end = new Date(start.getTime() + (opts.durationMinutes ?? 30) * 60_000)
  const summary = `TeleCare™ Consultation${opts.providerName ? ` with ${opts.providerName}` : ''}`
  const description = `Health Hub Africa TeleCare™ consultation. Reference: ${opts.hhaRef}. Join from the MyHealth Vault+™ patient portal a few minutes before the start time.`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Health Hub Africa//MyHealth Vault+//EN',
    'BEGIN:VEVENT',
    `UID:telecare-${opts.hhaRef}@myvaultplus.com`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `telecare-${opts.hhaRef}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
