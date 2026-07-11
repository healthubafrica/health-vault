'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminPatient, type PatientProfileDetail } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { formatDate, formatDateTime } from '@/lib/utils'
import { RefreshCw, Search, RotateCcw, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-muted)' }}
    >
      {copied ? <Check className="w-3 h-3" style={{ color: '#6DC43F' }} /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function ChipList({ label, items, bg, color }: { label: string; items: string[]; bg: string; color: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: bg, color }}>{item}</span>
        ))}
      </div>
    </div>
  )
}

function PatientDetailDialog({
  patient,
  onClose,
}: {
  patient: AdminPatient
  onClose: () => void
}) {
  // Clinical context comes from the full profile endpoint — the admin list
  // only carries directory fields.
  const [detail, setDetail] = useState<PatientProfileDetail | null>(null)
  const [detailError, setDetailError] = useState(false)
  const [storageMb, setStorageMb] = useState('')
  const [savingStorage, setSavingStorage] = useState(false)

  useEffect(() => {
    adminApi.patients.get(patient.id)
      .then(res => setDetail(res.data))
      .catch(() => setDetailError(true))
  }, [patient.id])

  const handleStorageSave = async (revert: boolean) => {
    const mb = revert ? null : Number(storageMb)
    if (!revert && (!storageMb.trim() || isNaN(mb!) || mb! < 0 || !Number.isInteger(mb))) {
      toast.error('Enter a whole number of MB')
      return
    }
    setSavingStorage(true)
    try {
      await adminApi.patients.setStorageOverride(patient.id, mb)
      toast.success(revert ? 'Storage quota reverted to plan default' : `Storage quota set to ${mb} MB`)
      setStorageMb('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update storage quota')
    } finally {
      setSavingStorage(false)
    }
  }

  const medicalInfo = detail?.medicalInfo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {patient.firstName} {patient.lastName}
            </h2>
            <Pill variant={syncStatusVariant(patient.openemrSyncStatus)}>{patient.openemrSyncStatus}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{patient.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Phone</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{patient.phone ?? '—'}</p>
            </div>
          </div>

          {/* IDs */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>HHA Patient ID</p>
            <div className="flex items-center gap-1">
              <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{patient.hhaPatientId}</p>
              <CopyButton value={patient.hhaPatientId} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>OpenEMR Patient UUID</p>
            {patient.openemrPatientUuid ? (
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono break-all" style={{ color: 'var(--color-text)' }}>{patient.openemrPatientUuid}</p>
                <CopyButton value={patient.openemrPatientUuid} />
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Not yet synced to OpenEMR</p>
            )}
          </div>

          {/* Subscription */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Subscription</p>
            {patient.subscriptionPlan ? (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{patient.subscriptionPlan}</span>
                <Pill variant={subStatusVariant(patient.subscriptionStatus)}>{patient.subscriptionStatus ?? 'none'}</Pill>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No active subscription</p>
            )}
          </div>

          {/* Clinical context — allergies/conditions/meds/immunizations, incl. what the OpenEMR pulls merged in */}
          {detailError ? (
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Could not load clinical details</p>
          ) : !detail ? (
            <SkeletonBox height={40} className="rounded" />
          ) : (
            <div className="space-y-3">
              {detail.bloodGroup && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Blood Group</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{detail.bloodGroup}</p>
                </div>
              )}
              <ChipList label="Allergies" items={medicalInfo?.allergies ?? []} bg="#FEE2E2" color="#991B1B" />
              <ChipList label="Chronic Conditions" items={medicalInfo?.chronicConditions ?? []} bg="#FEF3C7" color="#92400E" />
              <ChipList label="Active Medications" items={medicalInfo?.activeMedications ?? []} bg="var(--color-success-bg)" color="#006022" />
              <ChipList label="Immunizations" items={medicalInfo?.immunizations ?? []} bg="var(--color-info-bg)" color="#1E40AF" />
              {!medicalInfo?.allergies?.length && !medicalInfo?.chronicConditions?.length
                && !medicalInfo?.activeMedications?.length && !medicalInfo?.immunizations?.length && (
                <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No clinical history recorded</p>
              )}
            </div>
          )}

          {/* Storage override */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Storage Quota Override</p>
            <div className="flex items-center gap-2">
              <FormInput
                type="number"
                placeholder="Quota in MB"
                value={storageMb}
                onChange={(e) => setStorageMb(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={() => handleStorageSave(false)} disabled={savingStorage || !storageMb.trim()}>Set</Button>
              <Button size="sm" variant="secondary" onClick={() => handleStorageSave(true)} disabled={savingStorage}>Revert to plan</Button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Joined</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDate(patient.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Internal ID</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>{patient.id}</p>
                <CopyButton value={patient.id} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
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
  const [selected, setSelected] = useState<AdminPatient | null>(null)
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
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Patients</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{total.toLocaleString()} total patients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={syncing} onClick={triggerSync}>
            <RotateCcw className="w-3.5 h-3.5" />Sync Unsynced
          </Button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
        </div>
      </div>

      {syncBanner && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: syncBanner.type === 'success' ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-error-bg)', color: syncBanner.type === 'success' ? '#166534' : 'var(--color-emergency)' }}>
          {syncBanner.msg}
        </div>
      )}
      {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>{error}</div>}

      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
        <FormInput placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-8" />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['HHA ID', 'Name', 'Email', 'Subscription', 'OpenEMR Status', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 140 : 100 }} /></td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No patients found</td></tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.hhaPatientId}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{p.firstName} {p.lastName}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{p.email}</td>
                    <td className="px-4 py-3">
                      {p.subscriptionPlan ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: 'var(--color-text)' }}>{p.subscriptionPlan}</span>
                          <Pill variant={subStatusVariant(p.subscriptionStatus)}>{p.subscriptionStatus ?? 'none'}</Pill>
                        </div>
                      ) : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Pill variant={syncStatusVariant(p.openemrSyncStatus)}>{p.openemrSyncStatus}</Pill>
                        {p.openemrPatientUuid && (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                            OEMR: {p.openemrPatientUuid.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Page {page} of {totalPages} · {total} patients</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && <PatientDetailDialog patient={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
