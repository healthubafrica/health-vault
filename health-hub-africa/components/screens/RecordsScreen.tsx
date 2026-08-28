'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { type RecordType } from '@/lib/data/records'
import { formatDate, formatBytes } from '@/lib/utils'
import { FileText, FlaskConical, Pill as PillIcon, File, Download, Link2, Upload, Stethoscope, ClipboardCheck, ScanLine, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { records as recordsApi, labs as labsApi, type ClinicalRecord } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/states'
import { buildProviderDisplayName } from '@/lib/providerName'
import { toast } from 'sonner'

const TABS = ['All', 'Visits', 'Summaries', 'Labs', 'Imaging', 'Referrals', 'Expert Reviews', 'Prescriptions', 'Documents']

const TYPE_MAP: Record<string, RecordType | undefined> = {
  Visits: 'visit',
  Summaries: 'visit_summary',
  Labs: 'lab',
  Imaging: 'imaging',
  Referrals: 'referral',
  'Expert Reviews': 'expert_review',
  Prescriptions: 'prescription',
  Documents: 'document',
}

const ICON_MAP: Record<RecordType, React.ElementType> = {
  visit: FileText,
  lab: FlaskConical,
  referral: Stethoscope,
  visit_summary: ClipboardCheck,
  prescription: PillIcon,
  document: File,
  imaging: ScanLine,
  expert_review: UserCheck,
}

const PILL_MAP: Record<RecordType, 'success' | 'info' | 'neutral' | 'warning'> = {
  visit: 'success',
  lab: 'info',
  referral: 'info',
  visit_summary: 'success',
  prescription: 'warning',
  document: 'neutral',
  imaging: 'info',
  expert_review: 'success',
}

const LAB_STATUS_PILL: Record<'normal' | 'flagged', 'success' | 'warning'> = {
  normal: 'success',
  flagged: 'warning',
}

async function handleDownload(record: ClinicalRecord) {
  if (!record.fileUrl || !record.isDownloadable) return
  try {
    const objectKey = new URL(record.fileUrl).pathname.slice(1)
    const res = await recordsApi.getDownloadUrl(objectKey)
    window.open(res.data.downloadUrl, '_blank')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Download failed')
  }
}

export function RecordsScreen() {
  const [tab, setTab] = useState('All')
  const selectedType = TYPE_MAP[tab]

  const { data: recordsRes, isInitialLoad, error, refetch } = useApi(
    () => recordsApi.list(selectedType ? { type: selectedType } : undefined)
  )
  const { data: storageRes } = useApi(() => recordsApi.getStorageUsage())
  const storageData = storageRes?.data
  // Structured prescription details (dosage, frequency, refills, expiry) —
  // the clinical-record rows only carry the drug name as a title.
  const { data: rxList } = useApi(() => recordsApi.prescriptions())
  // Lab results never land in ClinicalRecord — OpenEMR-native orders are
  // routed to the dedicated LabOrder table instead (see
  // openemr.processor.ts). Pull them separately so the Labs tab shows real
  // data rather than filtering a recordType that's never written.
  const { data: labsRes } = useApi(() => labsApi.listOrders())
  const labResults = (labsRes?.data ?? []).flatMap(order =>
    order.results.map(r => ({
      id: `${order.id}-${r.id}`,
      test: r.testName,
      status: r.isFlagged ? 'flagged' as const : 'normal' as const,
      value: [r.valueDisplay, r.unit].filter(Boolean).join(' '),
      referenceRange: r.referenceRange,
      doctor: order.provider ? buildProviderDisplayName(order.provider) : 'Provider TBD',
      date: order.orderedAt,
    }))
  )

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading records" showAction />
  if (error && !recordsRes) return <ErrorState message={error} onRetry={refetch} />

  const allRecords: ClinicalRecord[] = recordsRes?.data ?? []

  const filtered = selectedType
    ? allRecords.filter(r => r.recordType === selectedType)
    : allRecords

  const storagePct = storageData?.quotaBytes
    ? Math.min(100, (storageData.usedBytes / storageData.quotaBytes) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Clinical Records
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Your complete medical history
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/vault"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none' }}
          >
            <Upload size={13} />
            Upload
          </Link>
          <Link
            href="/records/share"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none' }}
          >
            <Link2 size={13} />
            Share
          </Link>
        </div>
      </div>

      {storageData?.quotaBytes != null && (
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--color-text-muted)' }}>Storage Used</span>
            <span style={{ color: 'var(--color-text)' }}>
              {formatBytes(storageData.usedBytes)} of {formatBytes(storageData.quotaBytes)}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${storagePct}%`,
                background: storagePct >= 90 ? '#EF4444' : '#6DC43F',
              }}
            />
          </div>
          {storagePct >= 100 && (
            <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
              You have reached your Free Plan storage limit.{' '}
              <a href="/subscriptions" style={{ color: '#6DC43F', fontWeight: 700 }}>
                Upgrade to continue uploading records.
              </a>
            </p>
          )}
        </div>
      )}

      <FilterTabs tabs={TABS} active={tab} onChange={setTab} className="self-start" />

      {tab === 'Prescriptions' && (rxList?.length ?? 0) > 0 && (
        <Card padding="none">
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {rxList!.map(rx => (
              <div key={rx.id} className="flex items-start gap-3 p-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <PillIcon size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{rx.drugName}</p>
                    <Pill variant="warning">{rx.dosage}</Pill>
                    {rx.expiresAt && new Date(rx.expiresAt) < new Date() && (
                      <Pill variant="emergency">Expired</Pill>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {rx.frequency} · {rx.route} · {rx.refillsRemaining} refill{rx.refillsRemaining === 1 ? '' : 's'} left
                    {rx.expiresAt ? ` · expires ${formatDate(rx.expiresAt)}` : ''}
                  </p>
                  {rx.notes && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{rx.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Labs' && labResults.length > 0 && (
        <Card padding="none">
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {labResults.map(lab => (
              <div key={lab.id} className="flex items-start gap-3 p-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <FlaskConical size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{lab.test}</p>
                    <Pill variant={LAB_STATUS_PILL[lab.status]}>{lab.status}</Pill>
                  </div>
                  {lab.value && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-text)' }}>{lab.value}</p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {lab.doctor} · {formatDate(lab.date)}
                  </p>
                  {lab.referenceRange && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Ref: {lab.referenceRange}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* The structured lists above supersede the bare clinical-record rows
          for prescriptions and labs — neither type is ever written to
          ClinicalRecord, so the generic list below would just show empty. */}
      {!(tab === 'Prescriptions' && (rxList?.length ?? 0) > 0) &&
       !(tab === 'Labs' && labResults.length > 0) && (
      <Card padding="none">
        {filtered.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={`No ${tab !== 'All' ? tab.toLowerCase() : 'clinical'} records found`}
              description="There are no health records logged under this category yet."
              icon={FileText}
              variant="card"
            />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filtered.map(record => {
              const recordType = record.recordType as RecordType
              const Icon = ICON_MAP[recordType]
              const providerName = record.provider ? buildProviderDisplayName(record.provider) : null

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
                      <Pill variant={PILL_MAP[recordType]}>{record.recordType}</Pill>
                    </div>
                    {providerName && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {providerName} · {formatDate(record.recordedAt)}
                      </p>
                    )}
                    {!providerName && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(record.recordedAt)}
                      </p>
                    )}
                    {record.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{record.description}</p>
                    )}
                  </div>
                  {record.isDownloadable && record.fileUrl && (
                    <button
                      aria-label={`Download ${record.title}`}
                      title="Download this record as a file"
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onClick={() => handleDownload(record)}
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
      )}
    </div>
  )
}
