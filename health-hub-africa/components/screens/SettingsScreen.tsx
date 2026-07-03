'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/lib/settingsStore'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  auth,
  patients,
  consents,
  notificationPrefs,
  clearTokens,
  ApiError,
  type Session,
  type NotificationPrefs,
} from '@/lib/api'
import {
  Shield,
  Bell,
  Eye,
  Palette,
  MonitorSmartphone,
  Trash2,
  ChevronRight,
  LogOut,
  Loader2,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSessionLabel(session: Session): string {
  const agent = session.userAgent ?? 'Unknown device'
  // Trim to a readable length
  return agent.length > 60 ? agent.slice(0, 57) + '…' : agent
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const s = useSettingsStore()
  const router = useRouter()
  const { user } = useAuthStore()

  // ── Hydrate settings from server on mount ────────────────────────────────
  const [patientId, setPatientId] = useState<string | null>(null)

  useEffect(() => {
    async function hydrate() {
      try {
        const [profileRes, consentsRes] = await Promise.all([
          patients.getMyProfile(),
          consents.list(),
        ])
        const profile = profileRes.data
        setPatientId(profile.id)

        const consentMap: Record<string, boolean> = {}
        for (const c of consentsRes.data) {
          consentMap[c.consentType] = c.granted
        }

        s.hydrate({
          language: profile.preferredLanguage ?? s.language,
          dateFormat: profile.dateFormat ?? s.dateFormat,
          ...(typeof consentMap['data_sharing'] === 'boolean' && { dataSharing: consentMap['data_sharing'] }),
          ...(typeof consentMap['analytics'] === 'boolean' && { analyticsConsent: consentMap['analytics'] }),
          ...(typeof consentMap['research'] === 'boolean' && { researchConsent: consentMap['research'] }),
          ...(typeof consentMap['marketing'] === 'boolean' && { marketingEmails: consentMap['marketing'] }),
        })
      } catch {
        // Silently fall back to localStorage values — don't surface noise on mount
      }
    }
    hydrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function persistConsent(consentType: string, granted: boolean) {
    try {
      await consents.upsert({ consentType, granted })
    } catch {
      // Fire-and-forget; local state already updated
    }
  }

  async function persistPatientSettings(patch: { preferredLanguage?: string; dateFormat?: string }) {
    if (!patientId) return
    try {
      await patients.update(patientId, patch)
    } catch {
      // Fire-and-forget
    }
  }

  // ── Password change ──────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Kindly fill in all the password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Your new passwords don't match. Kindly check and try again.")
      return
    }
    if (newPassword.length < 8) {
      toast.error('Your password needs at least 8 characters.')
      return
    }
    setPasswordLoading(true)
    try {
      const res = await auth.changePassword(currentPassword, newPassword)
      toast.success(res.message ?? 'Your password has been updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't update your password. Please try again.")
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Two-factor authentication ────────────────────────────────────────────
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(s.twoFa)
  const [twoFaLoading, setTwoFaLoading] = useState(false)

  useEffect(() => {
    auth.get2faStatus()
      .then(res => setTwoFaEnabled(res.twoFactorEnabled))
      .catch(() => {
        // Fallback to store value on error; don't surface noise on mount
      })
  }, [])

  async function handleToggle2fa(enabled: boolean) {
    setTwoFaLoading(true)
    try {
      const res = await auth.toggle2fa(enabled)
      setTwoFaEnabled(res.twoFactorEnabled)
      s.set({ twoFa: res.twoFactorEnabled })
      toast.success(res.message ?? (res.twoFactorEnabled ? 'Two-factor sign-in is now on.' : 'Two-factor sign-in is now off.'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't update your two-factor setting. Please try again.")
    } finally {
      setTwoFaLoading(false)
    }
  }

  // ── Sessions ─────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [signOutAllLoading, setSignOutAllLoading] = useState(false)

  async function loadSessions() {
    setSessionsLoading(true)
    try {
      const res = await auth.getSessions()
      setSessions(res.data)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't load your sessions. Please try again.")
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => { loadSessions() }, [])

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId)
    try {
      const res = await auth.revokeSession(sessionId)
      toast.success(res.message ?? 'That session has been signed out.')
      await loadSessions()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't sign out that session. Please try again.")
    } finally {
      setRevokingId(null)
    }
  }

  async function handleSignOutAll() {
    setSignOutAllLoading(true)
    try {
      const res = await auth.logoutAll()
      toast.success(res.message ?? "You've been signed out of all your sessions.")
      clearTokens()
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't sign out all your sessions. Please try again.")
      setSignOutAllLoading(false)
    }
  }

  // ── Notification preferences ─────────────────────────────────────────────
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)

  useEffect(() => {
    notificationPrefs.get()
      .then(res => setPrefs(res.data))
      .catch(err => {
        toast.error(err instanceof ApiError ? err.message : "We couldn't load your notification preferences. Please try again.")
      })
      .finally(() => setPrefsLoading(false))
  }, [])

  async function handlePrefToggle(key: keyof NotificationPrefs, value: boolean) {
    // Optimistic update
    setPrefs(prev => prev ? { ...prev, [key]: value } : prev)
    try {
      const res = await notificationPrefs.update({ [key]: value })
      setPrefs(res.data)
    } catch (err) {
      // Revert on failure
      setPrefs(prev => prev ? { ...prev, [key]: !value } : prev)
      toast.error(err instanceof ApiError ? err.message : "We couldn't save that preference. Please try again.")
    }
  }

  // ── Data export ──────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false)

  async function handleDownloadData() {
    setExportLoading(true)
    try {
      await patients.requestExport()
      toast.success("Your data export is on the way — you'll get it by email within 24 hours.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't request your data export. Please try again.")
    } finally {
      setExportLoading(false)
    }
  }

  // ── Account deactivation ─────────────────────────────────────────────────
  const [deactivateExpanded, setDeactivateExpanded] = useState(false)
  const [deactivatePassword, setDeactivatePassword] = useState('')
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  async function handleDeactivate() {
    if (!deactivatePassword) {
      toast.error('Kindly enter your password to confirm.')
      return
    }
    setDeactivateLoading(true)
    try {
      const res = await patients.selfDeactivate(deactivatePassword)
      toast.success(res.message ?? 'Your account has been deactivated.')
      clearTokens()
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't deactivate your account. Please try again.")
      setDeactivateLoading(false)
    }
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
          <FormInput label="Email Address" type="email" value={user?.email ?? ''} readOnly />

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
            <Button size="sm" onClick={handlePasswordChange} disabled={passwordLoading}>
              {passwordLoading && <Loader2 size={13} className="animate-spin" />}
              Update Password
            </Button>
          </div>

          <div className="pt-1">
            <ToggleRow
              label="Two-Factor Authentication"
              description="Require a verification code on every login"
              checked={twoFaEnabled}
              onChange={handleToggle2fa}
              disabled={twoFaLoading}
            />
          </div>
        </div>
      </Card>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Bell} title="Notifications" />

        {prefsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : (
          <>
            <ToggleRow
              label="Email Notifications"
              description="Receive important updates via email"
              checked={prefs?.emailEnabled ?? false}
              onChange={v => handlePrefToggle('emailEnabled', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="SMS Alerts"
              description="Urgent alerts sent to your registered phone"
              checked={prefs?.smsEnabled ?? false}
              onChange={v => handlePrefToggle('smsEnabled', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Push Notifications"
              description="Browser or app push notifications"
              checked={prefs?.pushEnabled ?? false}
              onChange={v => handlePrefToggle('pushEnabled', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="WhatsApp Notifications"
              description="Receive updates via WhatsApp"
              checked={prefs?.whatsappEnabled ?? false}
              onChange={v => handlePrefToggle('whatsappEnabled', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Appointment Reminders"
              description="24-hour and 1-hour reminders before appointments"
              checked={prefs?.appointmentReminders ?? false}
              onChange={v => handlePrefToggle('appointmentReminders', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Lab Results Ready"
              description="Notify when CareTest™ lab results are available"
              checked={prefs?.labResultAlerts ?? false}
              onChange={v => handlePrefToggle('labResultAlerts', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Payment Receipts"
              description="Email receipts for all transactions"
              checked={prefs?.paymentReceipts ?? false}
              onChange={v => handlePrefToggle('paymentReceipts', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Dispatch Updates"
              description="Status updates for emergency dispatch cases"
              checked={prefs?.dispatchUpdates ?? false}
              onChange={v => handlePrefToggle('dispatchUpdates', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Expert Review Updates"
              description="Notifications when expert reviews are ready"
              checked={prefs?.expertReviewUpdates ?? false}
              onChange={v => handlePrefToggle('expertReviewUpdates', v)}
              disabled={!prefs}
            />
            <ToggleRow
              label="Marketing Emails"
              description="Health tips, product updates, and offers"
              checked={prefs?.marketingComms ?? false}
              onChange={v => handlePrefToggle('marketingComms', v)}
              disabled={!prefs}
            />
          </>
        )}
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
            persistConsent('data_sharing', v)
            toast.success(v ? 'Data sharing enabled.' : 'Data sharing disabled.')
          }}
        />
        <ToggleRow
          label="Analytics & Usage Data"
          description="Help improve MyHealth Vault+™ with anonymous usage data"
          checked={s.analyticsConsent}
          onChange={v => {
            s.set({ analyticsConsent: v })
            persistConsent('analytics', v)
          }}
        />
        <ToggleRow
          label="Medical Research Participation"
          description="Allow anonymised data to contribute to approved research studies"
          checked={s.researchConsent}
          onChange={v => {
            s.set({ researchConsent: v })
            persistConsent('research', v)
            toast.success(v ? 'Research consent recorded.' : 'Research consent withdrawn.')
          }}
        />

        <div className="pt-3">
          <button
            className="flex items-center gap-2 text-xs font-semibold transition-colors hover:underline"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => toast.info('Full consent manager is coming soon')}
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
            onChange={e => {
              // Only English is live today; the others stay visible but
              // disabled below so patients know translations are on the way.
              if (e.target.value !== 'en') return
              s.set({ language: e.target.value })
              persistPatientSettings({ preferredLanguage: e.target.value })
            }}
          >
            <option value="en">English</option>
            <option value="fr" disabled>Français — Coming soon</option>
            <option value="yo" disabled>Yorùbá — Coming soon</option>
            <option value="ha" disabled>Hausa — Coming soon</option>
            <option value="ig" disabled>Igbo — Coming soon</option>
            <option value="sw" disabled>Kiswahili — Coming soon</option>
            <option value="tw" disabled>Twi — Coming soon</option>
          </FormSelect>

          <FormSelect
            label="Date Format"
            value={s.dateFormat}
            onChange={e => {
              s.set({ dateFormat: e.target.value })
              persistPatientSettings({ dateFormat: e.target.value })
            }}
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

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm py-3" style={{ color: 'var(--color-text-muted)' }}>No active sessions found.</p>
        ) : (
          <div className="flex flex-col gap-0">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {formatSessionLabel(session)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {session.ipAddress ? `${session.ipAddress} · ` : ''}
                    Created {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                  aria-label={`Revoke session`}
                >
                  {revokingId === session.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <LogOut size={13} />
                  }
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3">
          <Button variant="secondary" size="sm" onClick={handleSignOutAll} disabled={signOutAllLoading}>
            {signOutAllLoading && <Loader2 size={13} className="animate-spin" />}
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
            <Button variant="secondary" size="sm" onClick={handleDownloadData} disabled={exportLoading} className="shrink-0">
              {exportLoading && <Loader2 size={13} className="animate-spin" />}
              Request Export
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'rgba(192,57,43,0.06)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#C0392B' }}>Deactivate Account</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Temporarily disable your account. Your data will be retained and recoverable.
                </p>
              </div>
              <Button
                variant="emergency-outline"
                size="sm"
                onClick={() => setDeactivateExpanded(prev => !prev)}
                className="shrink-0"
              >
                Deactivate
              </Button>
            </div>

            {deactivateExpanded && (
              <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: 'rgba(192,57,43,0.2)' }}>
                <p className="text-[11px] font-medium" style={{ color: '#C0392B' }}>
                  Enter your password to confirm account deactivation.
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FormInput
                      label="Confirm Password"
                      type="password"
                      value={deactivatePassword}
                      onChange={e => setDeactivatePassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    variant="emergency-outline"
                    size="sm"
                    onClick={handleDeactivate}
                    disabled={deactivateLoading}
                    className="shrink-0 mb-[1px]"
                  >
                    {deactivateLoading && <Loader2 size={13} className="animate-spin" />}
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
