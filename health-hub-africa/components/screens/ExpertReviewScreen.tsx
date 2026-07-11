'use client'

import { Stethoscope, FileCheck2 } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { formatDate } from '@/lib/utils'
import { expertReview, type ExpertReviewCaseItem } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'

// Keys mirror the Prisma ExpertReviewStatus enum.
const STATUS_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'emergency'> = {
  submitted: 'warning',
  under_review: 'success',
  specialist_assigned: 'success',
  in_consultation: 'success',
  report_ready: 'success',
  closed: 'neutral',
  cancelled: 'emergency',
}

const URGENCY_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'emergency'> = {
  routine: 'neutral',
  urgent: 'warning',
  emergency: 'emergency',
}

function statusLabel(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function ExpertReviewScreen() {
  const { data: cases, isInitialLoad, error, refetch } = useApi(() => expertReview.list())

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading expert review cases" />
  if (error && !cases) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Expert Review™
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Track your specialist second-opinion cases
        </p>
      </div>

      {(cases?.length ?? 0) === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Stethoscope size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No expert review cases yet</p>
            <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-faint)' }}>
              Book an Expert Review from the{' '}
              <Link href="/appointments" style={{ color: '#6DC43F', fontWeight: 600 }}>Appointments</Link>{' '}
              page to get a specialist second opinion on your case.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {cases!.map((c: ExpertReviewCaseItem) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {c.primaryDiagnosis || c.clinicalQuestion}
                    </p>
                    <Pill variant={STATUS_PILL[c.status] ?? 'neutral'}>{statusLabel(c.status)}</Pill>
                    <Pill variant={URGENCY_PILL[c.urgency] ?? 'neutral'}>{statusLabel(c.urgency)}</Pill>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {c.hhaRef} · {statusLabel(c.reviewType)} · Submitted {formatDate(c.submittedAt)}
                  </p>
                  {c.primaryDiagnosis && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>{c.clinicalQuestion}</p>
                  )}
                </div>
                {c.finalReport && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                    style={{ background: 'var(--color-success-bg)', color: '#006022' }}
                  >
                    <FileCheck2 size={13} />
                    Report ready
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
