'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type AdminUser, type AuditLog } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'
import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

const ROLES = ['patient', 'provider', 'coordinator', 'admin', 'super_admin']

const ROLE_PILL: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
  super_admin: 'warning',
  admin: 'info',
  coordinator: 'success',
  provider: 'neutral',
  patient: 'neutral',
}

const SYNC_PILL: Record<string, 'success' | 'warning' | 'emergency' | 'neutral'> = {
  synced: 'success',
  pending: 'warning',
  failed: 'emergency',
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user: adminUser } = useAuthStore()
  const isSuperAdmin = adminUser?.role === 'super_admin'

  const [user, setUser] = useState<AdminUser | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [rolePending, setRolePending] = useState(false)
  const [statusPending, setStatusPending] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    Promise.all([
      adminApi.users.get(id),
      adminApi.auditLogs.list({ userId: id, limit: 15 } as Parameters<typeof adminApi.auditLogs.list>[0]),
    ])
      .then(([userRes, logsRes]) => {
        setUser(userRes.data)
        setSelectedRole(userRes.data.role)
        setLogs(logsRes.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleRoleChange = async () => {
    if (!user || selectedRole === user.role) return
    setRolePending(true)
    try {
      const res = await adminApi.users.updateRole(id, selectedRole)
      setUser(res.data)
      toast.success(`Role updated to ${selectedRole}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role')
      setSelectedRole(user.role)
    } finally {
      setRolePending(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return
    setStatusPending(true)
    try {
      const res = await adminApi.users.toggleStatus(id, !user.isActive)
      setUser(res.data)
      toast.success(res.data.isActive ? 'User activated' : 'User deactivated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setStatusPending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <SkeletonBox height={20} className="rounded-lg w-24 mb-2" />
        <SkeletonBox height={100} className="rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonBox height={140} className="rounded-2xl" />
          <SkeletonBox height={140} className="rounded-2xl" />
        </div>
        <SkeletonBox height={260} className="rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>User not found.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push('/users')}>
          Back to Users
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push('/users')}
        className="flex items-center gap-1.5 text-sm mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Users
      </button>

      {/* Profile header */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={user.fullName ?? user.email} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {user.fullName ?? '(No name)'}
              </h1>
              <Pill variant={ROLE_PILL[user.role] ?? 'neutral'}>{user.role}</Pill>
              <Pill variant={user.isActive ? 'success' : 'neutral'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Pill>
            </div>
            <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
              {user.email}
            </p>
            {user.phoneNumber && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {user.phoneNumber}
              </p>
            )}
          </div>
          <Button
            variant={user.isActive ? 'secondary' : 'primary'}
            size="sm"
            loading={statusPending}
            onClick={handleToggleStatus}
            className="flex-shrink-0"
          >
            {user.isActive ? (
              <><ToggleRight className="w-3.5 h-3.5" />Deactivate</>
            ) : (
              <><ToggleLeft className="w-3.5 h-3.5" />Activate</>
            )}
          </Button>
        </div>

        {/* Role selector — super_admin only */}
        {isSuperAdmin && (
          <div
            className="mt-4 pt-4 border-t flex items-center gap-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              Role
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 h-8 px-2 rounded-lg text-sm border"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button
              size="sm"
              loading={rolePending}
              disabled={selectedRole === user.role}
              onClick={handleRoleChange}
            >
              Save
            </Button>
          </div>
        )}
      </Card>

      {/* Account info + subscription */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>Account Info</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <InfoRow label="User ID" value={user.id} mono />
            <InfoRow label="Joined" value={formatDate(user.createdAt)} />
            <InfoRow
              label="Last login"
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
            />
            <InfoRow label="Phone" value={user.phoneNumber ?? '—'} />
          </dl>
        </Card>

        <Card>
          <CardTitle>Subscription</CardTitle>
          {user.subscription ? (
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Plan" value={user.subscription.plan} />
              <InfoRow label="Tier" value={user.subscription.tier} />
              <InfoRow
                label="Status"
                value={
                  <Pill variant={user.subscription.status === 'active' ? 'success' : 'neutral'}>
                    {user.subscription.status}
                  </Pill>
                }
              />
              <InfoRow label="Expires" value={formatDate(user.subscription.expiresAt)} />
            </dl>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
              No subscription
            </p>
          )}
        </Card>
      </div>

      {/* Patient record */}
      {user.patient && (
        <Card className="mb-4">
          <CardTitle>Patient Record</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
            <InfoRow label="HHA ID" value={user.patient.hhaPatientId} mono />
            <InfoRow
              label="Name"
              value={`${user.patient.firstName} ${user.patient.lastName}`}
            />
            <InfoRow
              label="OpenEMR sync"
              value={
                <Pill variant={SYNC_PILL[user.patient.openemrSyncStatus] ?? 'neutral'}>
                  {user.patient.openemrSyncStatus}
                </Pill>
              }
            />
          </dl>
        </Card>
      )}

      {/* Recent audit trail */}
      <Card padding={false}>
        <div
          className="px-5 pt-4 pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Recent Activity
          </h3>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-text-faint)' }}>
            No activity recorded for this user.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  {['Action', 'Resource', 'IP', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-text)' }}>
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {log.resource}
                      {log.resourceId ? ` #${log.resourceId}` : ''}
                    </td>
                    <td
                      className="px-4 py-2.5 font-mono text-xs"
                      style={{ color: 'var(--color-text-faint)' }}
                    >
                      {log.ipAddress ?? '—'}
                    </td>
                    <td
                      className="px-4 py-2.5 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </dt>
      <dd
        className={mono ? 'font-mono text-xs truncate text-right' : 'text-right text-sm'}
        style={{ color: 'var(--color-text)' }}
      >
        {value}
      </dd>
    </div>
  )
}
