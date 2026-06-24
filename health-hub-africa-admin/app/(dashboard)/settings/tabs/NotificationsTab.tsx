'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { auth, type NotificationPrefs } from '@/lib/api'

const CHANNELS: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  { key: 'emailEnabled', label: 'Email', desc: 'Receive notifications via email' },
  { key: 'smsEnabled', label: 'SMS', desc: 'Receive text messages for urgent alerts' },
  { key: 'pushEnabled', label: 'Push', desc: 'Browser push notifications' },
  { key: 'whatsappEnabled', label: 'WhatsApp', desc: 'WhatsApp messages for select events' },
]

const CATEGORIES: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  { key: 'appointmentReminders', label: 'Appointment reminders', desc: 'Upcoming appointments and reschedules' },
  { key: 'labResultAlerts', label: 'Lab result alerts', desc: 'New lab results and flagged values' },
  { key: 'paymentReceipts', label: 'Payment receipts', desc: 'Subscription renewals and invoices' },
  { key: 'dispatchUpdates', label: 'DispatchCare updates', desc: 'Emergency dispatch status changes' },
  { key: 'expertReviewUpdates', label: 'Expert Review updates', desc: 'Status changes on review cases' },
  { key: 'marketingComms', label: 'Marketing communications', desc: 'Product news and announcements' },
]

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    auth
      .getNotificationPreferences()
      .then((res) => setPrefs(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key: keyof NotificationPrefs) => {
    if (!prefs) return
    setPrefs({ ...prefs, [key]: !prefs[key] })
    setDirty(true)
  }

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      const res = await auth.updateNotificationPreferences(prefs)
      setPrefs(res.data)
      setDirty(false)
      toast.success('Preferences saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardTitle>Notification preferences</CardTitle>
        <div className="flex flex-col gap-3">
          <SkeletonBox className="h-14 rounded-xl" />
          <SkeletonBox className="h-14 rounded-xl" />
          <SkeletonBox className="h-14 rounded-xl" />
        </div>
      </Card>
    )
  }

  if (!prefs) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--color-emergency)' }}>
          Could not load notification preferences.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Channels</CardTitle>
        <div className="flex flex-col">
          {CHANNELS.map((c) => (
            <ToggleRow
              key={c.key}
              label={c.label}
              desc={c.desc}
              checked={prefs[c.key]}
              onToggle={() => toggle(c.key)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>What to notify me about</CardTitle>
        <div className="flex flex-col">
          {CATEGORIES.map((c) => (
            <ToggleRow
              key={c.key}
              label={c.label}
              desc={c.desc}
              checked={prefs[c.key]}
              onToggle={() => toggle(c.key)}
            />
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          Save preferences
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string
  desc: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0 text-left"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {desc}
        </p>
      </div>
      <Switch checked={checked} />
    </button>
  )
}

function Switch({ checked }: { checked: boolean }) {
  return (
    <span
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? '#6DC43F' : 'var(--color-border)' }}
      aria-hidden
    >
      <span
        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </span>
  )
}
