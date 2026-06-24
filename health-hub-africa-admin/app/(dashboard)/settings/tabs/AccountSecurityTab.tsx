'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { Pill } from '@/components/ui/Pill'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'

export function AccountSecurityTab() {
  const user = useAuthStore((s) => s.user)

  const [twoFa, setTwoFa] = useState<boolean | null>(null)
  const [twoFaLoading, setTwoFaLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    auth
      .get2fa()
      .then((res) => setTwoFa(res.twoFactorEnabled))
      .catch(() => setTwoFa(false))
      .finally(() => setTwoFaLoading(false))
  }, [])

  const handleToggle2fa = async () => {
    if (twoFa === null) return
    setToggling(true)
    try {
      const res = await auth.toggle2fa(!twoFa)
      setTwoFa(res.twoFactorEnabled)
      toast.success(res.twoFactorEnabled ? '2FA enabled' : '2FA disabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update 2FA')
    } finally {
      setToggling(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setChanging(true)
    try {
      await auth.changePassword(currentPassword, newPassword)
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Profile (read-only) */}
      <Card>
        <CardTitle>Profile</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadOnlyField label="Email" value={user?.email ?? '—'} />
          <ReadOnlyField label="Role" value={user?.role ? formatRole(user.role) : '—'} />
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-faint)' }}>
          Contact a super admin to change your role or email.
        </p>
      </Card>

      {/* Change password */}
      <Card>
        <CardTitle>Change password</CardTitle>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-md">
          <FormInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <FormInput
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters"
            required
            minLength={8}
          />
          <FormInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div>
            <Button type="submit" loading={changing} disabled={!currentPassword || !newPassword}>
              Update password
            </Button>
          </div>
        </form>
      </Card>

      {/* 2FA */}
      <Card>
        <CardTitle>Two-factor authentication</CardTitle>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Require a one-time code on every login.
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Recommended for admin and super-admin accounts.
            </p>
          </div>
          {twoFaLoading ? (
            <SkeletonBox className="h-9 w-24 rounded-xl" />
          ) : (
            <div className="flex items-center gap-3">
              <Pill variant={twoFa ? 'success' : 'neutral'}>{twoFa ? 'On' : 'Off'}</Pill>
              <Button
                variant={twoFa ? 'secondary' : 'primary'}
                size="sm"
                loading={toggling}
                onClick={handleToggle2fa}
              >
                {twoFa ? 'Disable' : 'Enable'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div
        className="h-10 px-3 rounded-xl text-sm border flex items-center"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function formatRole(role: string): string {
  return role
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
