'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type AdminUser } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { formatDate } from '@/lib/utils'
import { Search, ChevronRight, RefreshCw, Mail, UserCheck } from 'lucide-react'

const ROLE_TABS = ['All', 'patient', 'provider', 'coordinator', 'admin', 'super_admin']
const STATUS_TABS = ['All', 'Active', 'Inactive']

const PLAN_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'info'> = {
  premium: 'success',
  pro: 'info',
  basic: 'neutral',
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('All')
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const [actioning, setActioning] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit }
      if (roleTab !== 'All') params.role = roleTab
      if (statusTab === 'Active') params.status = 'active'
      if (statusTab === 'Inactive') params.status = 'inactive'
      if (search.trim()) params.search = search.trim()

      const res = await adminApi.users.list(params as Parameters<typeof adminApi.users.list>[0])
      setUsers(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [page, roleTab, statusTab, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const showToast = (id: string, msg: string, ok: boolean) => {
    setToast({ id, msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const handleResendVerification = useCallback(async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
    setActioning(userId + ':verify')
    try {
      await adminApi.users.resendVerification(userId)
      showToast(userId, 'Verification email sent', true)
    } catch {
      showToast(userId, 'Failed to send verification email', false)
    } finally {
      setActioning(null)
    }
  }, [])

  const handleSendOnboarding = useCallback(async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
    setActioning(userId + ':onboard')
    try {
      await adminApi.users.sendOnboarding(userId)
      showToast(userId, 'Onboarding email sent', true)
    } catch {
      showToast(userId, 'Failed to send onboarding email', false)
    } finally {
      setActioning(null)
    }
  }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Users
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total accounts
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{
            background: toast.ok ? 'var(--color-success-bg, #d1fae5)' : 'var(--color-error-bg, #fee2e2)',
            color: toast.ok ? 'var(--color-success, #065f46)' : 'var(--color-emergency, #dc2626)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <FormInput
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <FilterTabs
          tabs={STATUS_TABS}
          active={statusTab}
          onChange={(t) => { setStatusTab(t); setPage(1) }}
        />
      </div>

      <FilterTabs
        tabs={ROLE_TABS}
        active={roleTab}
        onChange={(t) => { setRoleTab(t); setPage(1) }}
        className="mb-4"
      />

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {['User', 'Role', 'Status', 'Plan', 'Joined', 'Actions', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 0 ? 160 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const needsVerification = !u.isVerified
                  const needsOnboarding = u.isVerified && !u.patient

                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-b-0 hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                      onClick={() => router.push(`/users/${u.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.fullName ?? u.email} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
                              {u.fullName ?? '—'}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Pill variant="neutral">{u.role}</Pill>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Pill variant={u.isActive ? 'success' : 'neutral'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Pill>
                          {!u.isVerified && (
                            <Pill variant="warning">Unverified</Pill>
                          )}
                          {needsOnboarding && (
                            <Pill variant="info">No Profile</Pill>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.subscription ? (
                          <Pill variant={PLAN_PILL[u.subscription.tier] ?? 'neutral'}>
                            {u.subscription.plan}
                          </Pill>
                        ) : (
                          <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {needsVerification && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={actioning === u.id + ':verify'}
                              onClick={(e) => handleResendVerification(e, u.id)}
                              title="Resend email verification OTP"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Resend Verification
                            </Button>
                          )}
                          {needsOnboarding && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={actioning === u.id + ':onboard'}
                              onClick={(e) => handleSendOnboarding(e, u.id)}
                              title="Send email to complete onboarding"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Complete Onboarding
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-faint)' }} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages} · {total} users
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
