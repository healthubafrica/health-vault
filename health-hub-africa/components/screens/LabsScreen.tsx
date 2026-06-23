'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { FlaskConical } from 'lucide-react'
import { labs } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const LabBarsChart = dynamic(() => import('@/components/charts/LabBarsChart').then(m => ({ default: m.LabBarsChart })), { ssr: false })

const STATUS_PILL: Record<string, 'success' | 'warning'> = {
  normal: 'success',
  flagged: 'warning',
}

export function LabsScreen() {
  const router = useRouter()
  const { data: labsRes, isInitialLoad, error, refetch } = useApi(() => labs.listOrders())

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading lab results" showStats showBadge />
  if (error && !labsRes) return <ErrorState message={error} onRetry={refetch} />

  const allOrders = labsRes?.data ?? []

  const results = allOrders.flatMap((order) =>
    order.results.map((r) => ({
      id: `${order.id}-${r.id}`,
      test: r.testName,
      status: r.isFlagged ? 'flagged' : 'normal',
      value: [r.valueDisplay, r.unit].filter(Boolean).join(' '),
      referenceRange: r.referenceRange,
      doctor: order.provider ? `${order.provider.title} ${order.provider.lastName}` : 'Provider TBD',
      date: order.orderedAt,
    }))
  )

  const chartByMonth = new Map<string, { normal: number; flagged: number }>()
  for (const order of allOrders) {
    const month = new Date(order.orderedAt).toLocaleDateString('en-NG', { month: 'short' })
    const entry = chartByMonth.get(month) ?? { normal: 0, flagged: 0 }
    for (const r of order.results) {
      if (r.isFlagged) entry.flagged += 1
      else entry.normal += 1
    }
    chartByMonth.set(month, entry)
  }
  const chartData = chartByMonth.size === 0 ? undefined : {
    labels: Array.from(chartByMonth.keys()),
    normal: Array.from(chartByMonth.values()).map((v) => v.normal),
    flagged: Array.from(chartByMonth.values()).map((v) => v.flagged),
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            CareTest™ Labs
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Your diagnostic results and lab history
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            toast.info('Visit Appointments to book a CareTest™')
            router.push('/appointments')
          }}
        >
          <FlaskConical size={14} />Book CareTest™
        </Button>
      </div>

      <Card>
        <CardTitle>Results Overview</CardTitle>
        <LabBarsChart data={chartData} />
      </Card>

      <Card padding="none">
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle className="mb-0">Lab Results</CardTitle>
        </div>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <FlaskConical size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No lab results yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {results.map((lab) => (
              <div key={lab.id} className="p-4 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: lab.status === 'normal' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)' }}
                >
                  <FlaskConical size={14} style={{ color: lab.status === 'normal' ? '#006022' : 'var(--color-warning)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{lab.test}</p>
                    <Pill variant={STATUS_PILL[lab.status]}>{lab.status}</Pill>
                  </div>
                  {lab.value && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-primary-dark)' }}>{lab.value}</p>
                  )}
                  {lab.referenceRange && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ref: {lab.referenceRange}</p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                    {lab.doctor} · {formatDate(lab.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
