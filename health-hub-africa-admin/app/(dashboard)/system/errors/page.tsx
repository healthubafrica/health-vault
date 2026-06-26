'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, RotateCcw, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Severity = 'critical' | 'high' | 'medium' | 'low'

interface IntegrationError {
  id: string
  service: string
  operation: string
  message: string
  severity: Severity
  resolved: boolean
  retryCount: number
  createdAt: string
  resolvedAt?: string
}

const SEV_PILL: Record<Severity, 'emergency' | 'warning' | 'info' | 'neutral'> = {
  critical: 'emergency',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

const SEV_COLOR: Record<Severity, string> = {
  critical: 'var(--color-emergency)',
  high: '#F59E0B',
  medium: '#6AADFF',
  low: 'var(--color-text-muted)',
}

function ErrorDetailDialog({
  error,
  onClose,
  onRetry,
  retrying,
}: {
  error: IntegrationError
  onClose: () => void
  onRetry: (id: string) => void
  retrying: string | null
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4" style={{ color: SEV_COLOR[error.severity] }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Error Detail
            </h2>
            <Pill variant={SEV_PILL[error.severity] ?? 'neutral'}>{error.severity}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Service / Operation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Service
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {error.service}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Operation
              </p>
              <p className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                {error.operation}
              </p>
            </div>
          </div>

          {/* Error message */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Error Message
            </p>
            <div
              className="p-3 rounded-xl text-sm leading-relaxed font-mono"
              style={{
                background: 'var(--color-error-bg)',
                color: 'var(--color-emergency)',
                borderColor: 'var(--color-emergency)',
                border: '1px solid',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error.message}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Status
              </p>
              <Pill variant={error.resolved ? 'success' : 'emergency'}>
                {error.resolved ? 'resolved' : 'open'}
              </Pill>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Retry Count
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {error.retryCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Error ID
              </p>
              <p className="text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>
                {error.id}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                First Seen
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                {formatDateTime(error.createdAt)}
              </p>
            </div>
            {error.resolvedAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Resolved At
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                  {formatDateTime(error.resolvedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {!error.resolved && (
            <Button
              size="sm"
              loading={retrying === error.id}
              onClick={() => onRetry(error.id)}
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<IntegrationError[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [selected, setSelected] = useState<IntegrationError | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.system.errors()
      setErrors(res.data as IntegrationError[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await adminApi.system.retryError(id)
      toast.success('Retry queued')
      setSelected(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  const openCount = errors.filter((e) => !e.resolved).length
  const resolvedCount = errors.filter((e) => e.resolved).length

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Integration Errors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {openCount} open · {resolvedCount} resolved
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Service', 'Operation', 'Error', 'Severity', 'Retries', 'Time', ''].map((h) => (
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[90, 100, 200, 70, 40, 110, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No integration errors — all systems clear
                  </td>
                </tr>
              ) : (
                errors.map((err) => (
                  <tr
                    key={err.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)', opacity: err.resolved ? 0.6 : 1 }}
                    onClick={() => setSelected(err)}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {err.service}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {err.operation}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p
                        className="text-xs truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {err.message}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={SEV_PILL[err.severity] ?? 'neutral'}>{err.severity}</Pill>
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {err.retryCount}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(err.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {err.resolved ? (
                        <Pill variant="success">resolved</Pill>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={retrying === err.id}
                          onClick={() => handleRetry(err.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <ErrorDetailDialog
          error={selected}
          onClose={() => setSelected(null)}
          onRetry={handleRetry}
          retrying={retrying}
        />
      )}
    </div>
  )
}
