'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { type RecordType } from '@/lib/data/records'
import { formatDate } from '@/lib/utils'
import { FileText, FlaskConical, Pill as PillIcon, File, Download } from 'lucide-react'
import { records as recordsApi } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const TABS = ['All', 'Visits', 'Labs', 'Prescriptions', 'Documents']

const TYPE_MAP: Record<string, RecordType | undefined> = {
  Visits: 'visit',
  Labs: 'lab',
  Prescriptions: 'prescription',
  Documents: 'document',
}

const ICON_MAP: Record<RecordType, React.ElementType> = {
  visit: FileText,
  lab: FlaskConical,
  prescription: PillIcon,
  document: File,
}

const PILL_MAP: Record<RecordType, 'success' | 'info' | 'neutral' | 'warning'> = {
  visit: 'success',
  lab: 'info',
  prescription: 'warning',
  document: 'neutral',
}

export function RecordsScreen() {
  const [tab, setTab] = useState('All')
  const { data: recordsRes, isInitialLoad, error, refetch } = useApi(() => recordsApi.list())

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading records" showAction />
  if (error && !recordsRes) return <ErrorState message={error} onRetry={refetch} />

  const allRecords = (recordsRes?.data ?? []).map((r: any) => ({
    id: r.id,
    type: (r.recordType ?? r.type) as RecordType,
    title: r.title,
    date: r.recordedAt ?? r.date,
    doctor: r.provider ? `${r.provider.title} ${r.provider.lastName}` : r.doctor,
    description: r.description,
    fileUrl: r.fileUrl ?? null,
    downloadable: r.isDownloadable ?? r.downloadable ?? true,
  }))

  const filtered = allRecords.filter((r: any) =>
    tab === 'All' ? true : r.type === TYPE_MAP[tab]
  )

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Clinical Records
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Your complete medical history
        </p>
      </div>

      <FilterTabs tabs={TABS} active={tab} onChange={setTab} className="self-start" />

      <Card padding="none">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <FileText size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No records found</p>
          </div>
        ) : (
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {filtered.map(record => {
            const Icon = ICON_MAP[record.type]
            return (
              <div key={record.id} className="flex items-start gap-3 p-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <Icon size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{record.title}</p>
                    <Pill variant={PILL_MAP[record.type]}>{record.type}</Pill>
                  </div>
                  {record.doctor && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {record.doctor} · {formatDate(record.date)}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{record.description}</p>
                </div>
                {record.downloadable && (
                  <button
                    aria-label={`Download ${record.title}`}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        )}
      </Card>
    </div>
  )
}
