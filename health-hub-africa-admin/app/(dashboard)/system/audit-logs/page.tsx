'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AuditLog, type AuditLogDetail } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { formatDateTime, truncate } from '@/lib/utils'
import { RefreshCw, Search, X } from 'lucide-react'

function severityVariant(s: string): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (s === 'low' || s === 'info') return 'success'
  if (s === 'medium' || s === 'warning') return 'warning'
  if (s === 'high' || s === 'critical') return 'emergency'
  return 'neutral'
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AuditLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.auditLogs.list({ page, limit })
      setLogs(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const res = await adminApi.auditLogs.get(id)
      setSelected(res.data)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const filtered = search
    ? logs.filter(
        (l) =>
          (l.userEmail ?? '').includes(search) ||
          l.action.includes(search) ||
          l.resource.includes(search),
      )
    : logs

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Audit Logs
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Complete activity trail — Super Admin only
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-xs mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <FormInput
          placeholder="Filter by email, action, resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Time', 'User', 'Action', 'Resource', 'IP'].map((h) => (
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
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={12} className="rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No audit log entries found
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-b-0 hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => openDetail(log.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {truncate(log.userEmail, 32)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {log.resource}{log.resourceId ? `:${log.resourceId.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-faint)' }}>
                      {log.ipAddress ?? '—'}
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
              Page {page} of {totalPages} · {total} entries
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

      {/* Detail slide-over */}
      {(detailLoading || selected) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelected(null)}
          />
          {/* Panel */}
          <aside
            className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col shadow-2xl border-l overflow-y-auto"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                Audit Log Detail
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                aria-label="Close detail panel"
              >
                <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-5 flex flex-col gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBox key={i} height={20} className="rounded" />
                ))}
              </div>
            ) : selected && (
              <div className="p-5 flex flex-col gap-5">
                {/* User */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    User
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selected.userEmail}</p>
                  {selected.userRole && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{selected.userRole}</p>
                  )}
                </section>

                {/* Action */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Action
                  </p>
                  <p className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>{selected.action}</p>
                </section>

                {/* Resource */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Resource
                  </p>
                  <p className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                    {selected.resource}{selected.resourceId ? ` / ${selected.resourceId}` : ''}
                  </p>
                </section>

                {/* Severity */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Severity
                  </p>
                  <Pill variant={severityVariant(selected.severity)}>{selected.severity}</Pill>
                </section>

                {/* IP + User Agent */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    IP Address
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{selected.ipAddress ?? '—'}</p>
                  {selected.userAgent && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mt-3 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                        User Agent
                      </p>
                      <p className="text-xs break-all" style={{ color: 'var(--color-text-muted)' }}>{selected.userAgent}</p>
                    </>
                  )}
                </section>

                {/* Patient */}
                {selected.patient && (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Patient
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{selected.patient.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{selected.patient.hhaPatientId}</p>
                  </section>
                )}

                {/* Timestamp */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Timestamp
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{formatDateTime(selected.createdAt)}</p>
                </section>

                {/* Metadata */}
                {selected.metadata !== undefined && (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Metadata
                    </p>
                    <pre
                      className="text-xs rounded-xl p-3 overflow-x-auto"
                      style={{
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  )
}
