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
import { Search, ChevronRight, RefreshCw } from 'lucide-react'

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
                {['User', 'Role', 'Status', 'Plan', 'Joined', ''].map((h) => (
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
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 0 ? 160 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
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
                      <Pill variant={u.isActive ? 'success' : 'neutral'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Pill>
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
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-faint)' }} />
                    </td>
                  </tr>
                ))
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
