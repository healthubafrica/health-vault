'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, RotateCcw } from 'lucide-react'
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

export default function ErrorsPage() {
  const [errors, setErrors] = useState<IntegrationError[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

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
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)', opacity: err.resolved ? 0.6 : 1 }}
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
                        title={err.message}
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
                    <td className="px-4 py-3">
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
    </div>
  )
}
