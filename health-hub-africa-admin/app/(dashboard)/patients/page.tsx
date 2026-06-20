'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminPatient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Search, RotateCcw } from 'lucide-react'

function syncStatusVariant(status: string): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (status === 'synced') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed') return 'emergency'
  return 'neutral'
}

function subStatusVariant(status?: string): 'success' | 'neutral' {
  if (status === 'active') return 'success'
  return 'neutral'
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [syncing, setSyncing] = useState(false)
  const [syncBanner, setSyncBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof adminApi.patients.list>[0] = { page, limit }
      if (search.trim()) params.search = search.trim()
      const res = await adminApi.patients.list(params)
      setPatients(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    setSyncBanner(null)
    try {
      const res = await adminApi.openemr.recoverAll()
      setSyncBanner({
        type: 'success',
        msg: res.enqueued === 0
          ? 'All patients are already synced to OpenEMR.'
          : `${res.enqueued} patient${res.enqueued !== 1 ? 's' : ''} queued for sync. Refresh in a moment to see progress.`,
      })
      if (res.enqueued > 0) setTimeout(load, 4000)
    } catch (err) {
      setSyncBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Sync trigger failed' })
    } finally {
      setSyncing(false)
    }
  }, [load])

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
            Patients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} total patients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={syncing} onClick={triggerSync}>
            <RotateCcw className="w-3.5 h-3.5" />
            Sync Unsynced
          </Button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {syncBanner && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{
            background: syncBanner.type === 'success' ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-error-bg)',
            color: syncBanner.type === 'success' ? '#166534' : 'var(--color-emergency)',
          }}
        >
          {syncBanner.msg}
        </div>
      )}

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      <div className="relative max-w-xs mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <FormInput
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['HHA ID', 'Name', 'Email', 'Subscription', 'OpenEMR Status', 'Joined'].map((h) => (
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
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 140 : 100 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.hhaPatientId}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {p.email}
                    </td>
                    <td className="px-4 py-3">
                      {p.subscriptionPlan ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: 'var(--color-text)' }}>{p.subscriptionPlan}</span>
                          <Pill variant={subStatusVariant(p.subscriptionStatus)}>
                            {p.subscriptionStatus ?? 'none'}
                          </Pill>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Pill variant={syncStatusVariant(p.openemrSyncStatus)}>
                          {p.openemrSyncStatus}
                        </Pill>
                        {p.openemrPatientUuid && (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                            {p.openemrPatientUuid.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages} · {total} patients
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
