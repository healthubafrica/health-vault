'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/lib/settingsStore'
import {
  Shield,
  Bell,
  Eye,
  Palette,
  MonitorSmartphone,
  Trash2,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Toggle component ──────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <label htmlFor={id} className="text-sm font-medium cursor-pointer select-none" style={{ color: 'var(--color-text)' }}>
          {label}
        </label>
        {description && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
          checked ? 'bg-[var(--color-primary)]' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ElementType
  title: string
}

function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center w-7 h-7 rounded-xl" style={{ background: 'var(--color-primary-light)' }}>
        <Icon size={14} style={{ color: 'var(--color-primary)' }} />
      </span>
      <CardTitle className="mb-0">{title}</CardTitle>
    </div>
  )
}

// ── Sessions mock ─────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome on MacBook Pro', location: 'Lagos, Nigeria', lastSeen: 'Now (current)', current: true },
  { id: '2', device: 'Safari on iPhone 15', location: 'Lagos, Nigeria', lastSeen: '2 hours ago', current: false },
  { id: '3', device: 'Chrome on Windows', location: 'Accra, Ghana', lastSeen: '3 days ago', current: false },
]

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const s = useSettingsStore()

  // Password change is local-only (no store needed)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    toast.success('Password updated successfully.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  function handleRevokeSession(_id: string) {
    toast.success('Session revoked.')
  }

  function handleSignOutAll() {
    toast.success('All other sessions have been signed out.')
  }

  function handleDownloadData() {
    toast.success("Data export requested. You'll receive an email within 24 hours.")
  }

  function handleDeactivate() {
    toast.error('Account deactivation requires confirmation. Please contact support.')
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
        >
          Settings
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage your account, privacy, and preferences
        </p>
      </div>

      {/* ── Account & Security ─────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Shield} title="Account & Security" />

        <div className="flex flex-col gap-4">
          <FormInput label="Email Address" type="email" defaultValue="b.okafor@email.com" readOnly />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <FormInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              hint="Minimum 8 characters"
            />
            <FormInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <Button size="sm" onClick={handlePasswordChange}>
              Update Password
            </Button>
          </div>

          <div className="pt-1">
            <ToggleRow
              label="Two-Factor Authentication"
              description="Require a verification code on every login"
              checked={s.twoFa}
              onChange={v => {
                s.set({ twoFa: v })
                toast.success(v ? '2FA enabled.' : '2FA disabled.')
              }}
            />
          </div>
        </div>
      </Card>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Bell} title="Notifications" />

        <ToggleRow
          label="Email Notifications"
          description="Receive important updates via email"
          checked={s.emailNotifs}
          onChange={v => s.set({ emailNotifs: v })}
        />
        <ToggleRow
          label="SMS Alerts"
          description="Urgent alerts sent to your registered phone"
          checked={s.smsAlerts}
          onChange={v => s.set({ smsAlerts: v })}
        />
        <ToggleRow
          label="Push Notifications"
          description="Browser or app push notifications"
          checked={s.pushNotifs}
          onChange={v => s.set({ pushNotifs: v })}
        />
        <ToggleRow
          label="Appointment Reminders"
          description="24-hour and 1-hour reminders before appointments"
          checked={s.appointmentReminders}
          onChange={v => s.set({ appointmentReminders: v })}
        />
        <ToggleRow
          label="Lab Results Ready"
          description="Notify when CareTest™ lab results are available"
          checked={s.labResults}
          onChange={v => s.set({ labResults: v })}
        />
        <ToggleRow
          label="Payment Receipts"
          description="Email receipts for all transactions"
          checked={s.paymentReceipts}
          onChange={v => s.set({ paymentReceipts: v })}
        />
        <ToggleRow
          label="Marketing Emails"
          description="Health tips, product updates, and offers"
          checked={s.marketingEmails}
          onChange={v => s.set({ marketingEmails: v })}
        />
      </Card>

      {/* ── Privacy & Data ─────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Eye} title="Privacy & Data" />

        <ToggleRow
          label="Share Data with Care Providers"
          description="Allow assigned providers to view your full health record"
          checked={s.dataSharing}
          onChange={v => {
            s.set({ dataSharing: v })
            toast.success(v ? 'Data sharing enabled.' : 'Data sharing disabled.')
          }}
        />
        <ToggleRow
          label="Analytics & Usage Data"
          description="Help improve MyHealth Vault+™ with anonymous usage data"
          checked={s.analyticsConsent}
          onChange={v => s.set({ analyticsConsent: v })}
        />
        <ToggleRow
          label="Medical Research Participation"
          description="Allow anonymised data to contribute to approved research studies"
          checked={s.researchConsent}
          onChange={v => {
            s.set({ researchConsent: v })
            toast.success(v ? 'Research consent recorded.' : 'Research consent withdrawn.')
          }}
        />

        <div className="pt-3">
          <button
            className="flex items-center gap-2 text-xs font-semibold transition-colors hover:underline"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => toast.success('Opening full consent manager…')}
          >
            Manage all consents <ChevronRight size={14} />
          </button>
        </div>
      </Card>

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Palette} title="Appearance" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Language"
            value={s.language}
            onChange={e => s.set({ language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="yo">Yorùbá</option>
            <option value="ha">Hausa</option>
            <option value="ig">Igbo</option>
            <option value="sw">Kiswahili</option>
            <option value="tw">Twi</option>
          </FormSelect>

          <FormSelect
            label="Date Format"
            value={s.dateFormat}
            onChange={e => s.set({ dateFormat: e.target.value })}
          >
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </FormSelect>
        </div>
      </Card>

      {/* ── Active Sessions ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={MonitorSmartphone} title="Active Sessions" />

        <div className="flex flex-col gap-0">
          {MOCK_SESSIONS.map(session => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {session.device}
                  {session.current && (
                    <span
                      className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    >
                      Current
                    </span>
                  )}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {session.location} · {session.lastSeen}
                </span>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                  aria-label={`Revoke session on ${session.device}`}
                >
                  <LogOut size={13} />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-3">
          <Button variant="secondary" size="sm" onClick={handleSignOutAll}>
            Sign Out All Other Sessions
          </Button>
        </div>
      </Card>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <Card className="border-[var(--color-emergency)]/30">
        <SectionHeader icon={Trash2} title="Danger Zone" />

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4 rounded-xl p-3" style={{ background: 'var(--color-border)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Download My Data</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Export a copy of all your health records, appointments, and account data.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleDownloadData} className="shrink-0">
              Request Export
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl p-3" style={{ background: 'rgba(192,57,43,0.06)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#C0392B' }}>Deactivate Account</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Temporarily disable your account. Your data will be retained and recoverable.
              </p>
            </div>
            <Button variant="emergency-outline" size="sm" onClick={handleDeactivate} className="shrink-0">
              Deactivate
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
