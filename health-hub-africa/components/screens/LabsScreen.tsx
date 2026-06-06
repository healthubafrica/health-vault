'use client'

import dynamic from 'next/dynamic'
import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { LAB_RESULTS } from '@/lib/data/labs'
import { formatDate } from '@/lib/utils'
import { Download, FlaskConical } from 'lucide-react'
import { labs } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const LabBarsChart = dynamic(() => import('@/components/charts/LabBarsChart').then(m => ({ default: m.LabBarsChart })), { ssr: false })

const STATUS_PILL: Record<string, 'success' | 'warning' | 'emergency'> = {
  normal: 'success',
  review: 'warning',
  critical: 'emergency',
}

export function LabsScreen() {
  const { data: labsRes, isInitialLoad, error, refetch } = useApi(() => labs.listOrders())

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading lab results" showStats showBadge />
  if (error && !labsRes) return <ErrorState message={error} onRetry={refetch} />

  const allOrders = labsRes?.data ?? LAB_RESULTS

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
        <Button size="sm"><FlaskConical size={14} />Book CareTest™</Button>
      </div>

      <Card>
        <CardTitle>Results Overview</CardTitle>
        <LabBarsChart />
      </Card>

      <Card padding="none">
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle className="mb-0">Lab Results</CardTitle>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {allOrders.map((lab: any) => (
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
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{lab.note}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{formatDate(lab.date)}</p>
              </div>
              {lab.downloadable && (
                <button
                  aria-label={`Download ${lab.test} results`}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Download size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
