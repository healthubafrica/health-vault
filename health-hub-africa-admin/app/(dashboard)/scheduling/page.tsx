'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type ServiceGroup, type ServiceType, type ShiftTemplate, type AdminProvider, type SchedulingPolicy } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { Network, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { buildProviderDisplayName } from '@/lib/providerName'

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = [
  'HealthConsult', 'TeleCare', 'MinuteCare', 'CareTest', 'ExpertReview', 'NeuroFlex', 'DispatchCare',
]

const SERVICE_LABELS: Record<ServiceType, string> = {
  HealthConsult: 'Health Consult',
  TeleCare: 'TeleCare',
  MinuteCare: 'MinuteCare',
  CareTest: 'Care Test',
  ExpertReview: 'Expert Review',
  NeuroFlex: 'NeuroFlex',
  DispatchCare: 'DispatchCare',
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Backup', 3: 'Overflow' }
const PRIORITY_VARIANTS: Record<number, 'success' | 'warning' | 'neutral'> = {
  1: 'success', 2: 'warning', 3: 'neutral',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function extractHHMM(isoOrTime: string): string {
  if (isoOrTime.includes('T')) return new Date(isoOrTime).toISOString().slice(11, 16)
  return isoOrTime.slice(0, 5)
}

// ── Service Assignments tab ────────────────────────────────────────────────

function AddServiceGroupForm({
  providers,
  onSaved,
  onCancel,
}: {
  providers: AdminProvider[]
  onSaved: () => void
  onCancel: () => void
}) {
  const [providerId, setProviderId] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('HealthConsult')
  const [priority, setPriority] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!providerId) { setError('Select a provider'); return }
    setSaving(true)
    setError('')
    try {
      await adminApi.scheduling.serviceGroups.create({ providerId, serviceType, priority })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Assign Provider to Service</p>
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Provider</label>
          <select
            value={providerId}
            onChange={e => setProviderId(e.target.value)}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="">Select provider…</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {buildProviderDisplayName(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Service Type</label>
          <select
            value={serviceType}
            onChange={e => setServiceType(e.target.value as ServiceType)}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value={1}>1 — Primary</option>
            <option value={2}>2 — Backup</option>
            <option value={3}>3 — Overflow</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>Assign</Button>
      </div>
    </div>
  )
}

function ServiceAssignmentsTab() {
  const [groups, setGroups] = useState<ServiceGroup[]>([])
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterService, setFilterService] = useState<ServiceType | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [groupsData, providersData] = await Promise.all([
        adminApi.scheduling.serviceGroups.list(filterService || undefined),
        adminApi.providers.list({ limit: 100 }),
      ])
      setGroups(groupsData)
      setProviders(providersData.data)
    } finally {
      setLoading(false)
    }
  }, [filterService])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this provider from the service?')) return
    setDeletingId(id)
    try {
      await adminApi.scheduling.serviceGroups.delete(id)
      setGroups(prev => prev.filter(g => g.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (group: ServiceGroup) => {
    await adminApi.scheduling.serviceGroups.update(group.id, { isActive: !group.isActive })
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isActive: !g.isActive } : g))
  }

  const handlePriorityChange = async (group: ServiceGroup, priority: number) => {
    await adminApi.scheduling.serviceGroups.update(group.id, { priority })
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, priority } : g))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value as ServiceType | '')}
            className="h-9 pl-3 pr-8 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="">All Services</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={load} loading={loading}>Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />Assign Provider
          </Button>
        </div>
      </div>

      {showForm && (
        <AddServiceGroupForm
          providers={providers}
          onSaved={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <SkeletonBox key={i} height={56} className="rounded-2xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            No service assignments yet. Click &quot;Assign Provider&quot; to get started.
          </p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {groups.map(group => (
              <div key={group.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                {/* Provider */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {buildProviderDisplayName(group.provider)}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {group.provider.specialty}
                  </p>
                </div>

                {/* Service badge */}
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  {SERVICE_LABELS[group.serviceType]}
                </span>

                {/* Priority selector */}
                <select
                  value={group.priority}
                  onChange={e => handlePriorityChange(group, Number(e.target.value))}
                  className="h-7 px-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value={1}>Primary</option>
                  <option value={2}>Backup</option>
                  <option value={3}>Overflow</option>
                </select>
                <Pill variant={PRIORITY_VARIANTS[group.priority] ?? 'neutral'}>
                  {PRIORITY_LABELS[group.priority] ?? `P${group.priority}`}
                </Pill>

                {/* Shift count */}
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {group.shiftAssignments.length} shift{group.shiftAssignments.length !== 1 ? 's' : ''}
                </span>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(group)}
                  className="text-xs font-medium underline shrink-0"
                  style={{ color: group.isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                >
                  {group.isActive ? 'Active' : 'Paused'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(group.id)}
                  disabled={deletingId === group.id}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors disabled:opacity-40"
                  aria-label="Remove"
                >
                  {deletingId === group.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                    : <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-emergency)' }} />}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Shift Templates tab ────────────────────────────────────────────────────

function AddShiftTemplateForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('HealthConsult')
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (endTime <= startTime) { setError('End time must be after start time'); return }
    setSaving(true)
    setError('')
    try {
      await adminApi.scheduling.shiftTemplates.create({ name: name.trim(), serviceType, dayOfWeek, startTime, endTime })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New Shift Template</p>
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Template Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Shift"
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Service</label>
          <select
            value={serviceType}
            onChange={e => setServiceType(e.target.value as ServiceType)}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Day</label>
          <select
            value={dayOfWeek}
            onChange={e => setDayOfWeek(Number(e.target.value))}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            {[1,2,3,4,5,6,0].map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="h-9 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>Create Template</Button>
      </div>
    </div>
  )
}

function ShiftTemplatesTab() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterService, setFilterService] = useState<ServiceType | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.scheduling.shiftTemplates.list(filterService || undefined)
      setTemplates(data)
    } finally {
      setLoading(false)
    }
  }, [filterService])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this shift template? Existing assignments will also be removed.')) return
    setDeletingId(id)
    try {
      await adminApi.scheduling.shiftTemplates.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  // Group by service type for a cleaner display
  const grouped = SERVICE_TYPES.reduce<Record<ServiceType, ShiftTemplate[]>>((acc, st) => {
    acc[st] = templates.filter(t => t.serviceType === st)
    return acc
  }, {} as Record<ServiceType, ShiftTemplate[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value as ServiceType | '')}
            className="h-9 pl-3 pr-8 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="">All Services</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={load} loading={loading}>Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />New Template
          </Button>
        </div>
      </div>

      {showForm && (
        <AddShiftTemplateForm
          onSaved={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <SkeletonBox key={i} height={80} className="rounded-2xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            No shift templates yet. Create one to define provider time windows per service.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {SERVICE_TYPES.filter(st => (filterService ? st === filterService : grouped[st].length > 0)).map(st => (
            <div key={st}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
                {SERVICE_LABELS[st]}
              </p>
              <Card padding={false}>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {grouped[st].length === 0 ? (
                    <p className="text-xs px-4 py-3" style={{ color: 'var(--color-text-faint)' }}>No templates for this service.</p>
                  ) : grouped[st].map(tmpl => (
                    <div key={tmpl.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{tmpl.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {DAY_LABELS[tmpl.dayOfWeek]} · {extractHHMM(tmpl.startTime)}–{extractHHMM(tmpl.endTime)}
                        </p>
                      </div>
                      <Pill variant={tmpl.isActive ? 'success' : 'neutral'}>{tmpl.isActive ? 'Active' : 'Inactive'}</Pill>
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        disabled={deletingId === tmpl.id}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors disabled:opacity-40"
                        aria-label="Delete template"
                      >
                        {deletingId === tmpl.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                          : <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-emergency)' }} />}
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Self-Service Policy Tab ────────────────────────────────────────────────

function SchedulingPolicyTab() {
  const [policy, setPolicy] = useState<SchedulingPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24)
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState(24)
  const [selfServiceEnabled, setSelfServiceEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.scheduling.policy.get()
      setPolicy(data)
      setCancellationWindowHours(data.cancellationWindowHours)
      setRescheduleWindowHours(data.rescheduleWindowHours)
      setSelfServiceEnabled(data.selfServiceEnabled)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await adminApi.scheduling.policy.update({
        cancellationWindowHours,
        rescheduleWindowHours,
        selfServiceEnabled,
      })
      setPolicy(updated)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <SkeletonBox height={16} className="rounded" style={{ width: 220 }} />
          <SkeletonBox height={40} className="rounded-xl" />
          <SkeletonBox height={40} className="rounded-xl" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="max-w-md flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Patient self-service scheduling
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Controls whether patients can cancel or reschedule their own appointments, and how close
            to the appointment time they're allowed to do so.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Self-service enabled
          </span>
          <button
            onClick={() => setSelfServiceEnabled((v) => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
            style={{ background: selfServiceEnabled ? '#6DC43F' : 'var(--color-border)' }}
            aria-label={selfServiceEnabled ? 'Disable self-service scheduling' : 'Enable self-service scheduling'}
            aria-checked={selfServiceEnabled}
            role="switch"
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: selfServiceEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <FormInput
          label="Cancellation window (hours)"
          type="number"
          min={0}
          value={cancellationWindowHours}
          onChange={(e) => setCancellationWindowHours(parseInt(e.target.value, 10) || 0)}
        />
        <FormInput
          label="Reschedule window (hours)"
          type="number"
          min={0}
          value={rescheduleWindowHours}
          onChange={(e) => setRescheduleWindowHours(parseInt(e.target.value, 10) || 0)}
        />

        <Button size="sm" onClick={handleSave} disabled={saving} className="self-start">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>

        {policy?.updatedAt && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
            Last updated {new Date(policy.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'assignments' | 'templates' | 'policy'

export default function SchedulingPage() {
  const [tab, setTab] = useState<Tab>('assignments')

  return (
    <div className="max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Network className="w-5 h-5" style={{ color: '#6DC43F' }} />
        <div>
          <h1 className="text-lg font-bold leading-none" style={{ color: 'var(--color-text)' }}>
            Scheduling
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Assign providers to services and define shift time windows
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5 self-start w-fit"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {([
          { key: 'assignments', label: 'Service Assignments' },
          { key: 'templates', label: 'Shift Templates' },
          { key: 'policy', label: 'Self-Service Policy' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === key ? '#6DC43F22' : 'transparent',
              color: tab === key ? '#6DC43F' : 'var(--color-text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'assignments' ? (
        <ServiceAssignmentsTab />
      ) : tab === 'templates' ? (
        <ShiftTemplatesTab />
      ) : (
        <SchedulingPolicyTab />
      )}
    </div>
  )
}
