'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { adminApi, type AdminProvider, type AdminUser, type ImportProviderResult } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { RefreshCw, Search, Star, Users, Download, X, Copy, Info, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatDate } from '@/lib/utils'

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function ProviderDetailDialog({
  provider,
  onClose,
}: {
  provider: AdminProvider
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: '#6DC43F22', color: '#6DC43F' }}
            >
              {getInitials(provider.firstName, provider.lastName)}
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {provider.title} {provider.firstName} {provider.lastName}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{provider.specialty}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</p>
              <p className="text-sm break-all" style={{ color: 'var(--color-text)' }}>{provider.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Availability</p>
              <Pill variant={provider.isAvailable ? 'success' : 'neutral'}>{provider.isAvailable ? 'Available' : 'Unavailable'}</Pill>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>License Number</p>
              <p className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>{provider.licenseNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Joined</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{formatDate(provider.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Total Patients</p>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{provider.totalPatients}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Rating</p>
              {provider.rating ? (
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#F5A623' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{provider.rating}</span>
                </div>
              ) : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Provider ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{provider.id}</p>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function ProvidersPage() {
  const { user: authUser } = useAuthStore()
  const isSuperAdmin = authUser?.role === 'super_admin'

  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [toggling, setToggling] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportProviderResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminProvider | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const limit = 20

  const isAdmin = authUser?.role === 'admin' || authUser?.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof adminApi.providers.list>[0] = { page, limit }
      if (search.trim()) params.search = search.trim()
      const res = await adminApi.providers.list(params)
      setProviders(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const handleToggle = useCallback(async (id: string, current: boolean) => {
    setToggling(id)
    setProviders((prev) =>
      prev.map((p) => p.id === id ? { ...p, isAvailable: !current } : p)
    )
    try {
      await adminApi.providers.toggleAvailability(id, !current)
    } catch (err) {
      // Revert on failure
      setProviders((prev) =>
        prev.map((p) => p.id === id ? { ...p, isAvailable: current } : p)
      )
      setError(err instanceof Error ? err.message : 'Failed to update availability')
    } finally {
      setToggling(null)
    }
  }, [])

  const handleVerify = useCallback(async (id: string) => {
    if (!window.confirm("Mark this provider's credentials as verified? This unblocks bookings and triggers a push to OpenEMR.")) return
    setVerifying(id)
    try {
      const res = await adminApi.providers.verify(id)
      setProviders((prev) =>
        prev.map((p) => p.id === id ? { ...p, isVerified: true, verifiedAt: res.data.verifiedAt } : p)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify provider')
    } finally {
      setVerifying(null)
    }
  }, [])

  const handleCreated = useCallback(() => {
    setCreateOpen(false)
    load()
  }, [load])

  const handleImport = useCallback(async () => {
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const res = await adminApi.providers.importFromOpenemr()
      setImportResult(res)
      if (res.imported > 0) setTimeout(load, 1500)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Providers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} healthcare providers
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add Provider
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="secondary" size="sm" loading={importing} onClick={handleImport}>
              <Download className="w-3.5 h-3.5" />
              Import from OpenEMR
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Two-way sync notice */}
      <div
        className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border"
        style={{ background: 'var(--color-info-bg, #1A2C3F)', borderColor: 'var(--color-border)' }}
      >
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#6AADFF' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Providers can be created on either side. New HHA provider records push to OpenEMR's user table automatically (see <span className="font-medium" style={{ color: 'var(--color-text)' }}>/system/errors</span> if a push fails). Use <span className="font-medium" style={{ color: 'var(--color-text)' }}>Import from OpenEMR</span> to pull practitioners that were added directly on the OpenEMR side.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      {importError && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          Import failed: {importError}
        </div>
      )}

      {importResult && (
        <div
          className="mb-5 rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Import complete — {importResult.imported} imported, {importResult.skipped} skipped of {importResult.total} practitioners
            </p>
            <button onClick={() => setImportResult(null)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" style={{ color: 'var(--color-text)' }} />
            </button>
          </div>
          {importResult.providers.filter((p) => p.status === 'imported').length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {['Name', 'Email', 'Temp Password', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importResult.providers.filter((p) => p.status === 'imported').map((p, i) => (
                    <tr key={i} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text)' }}>{p.firstName} {p.lastName}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{p.email}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-text)' }}>{p.tempPassword ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {p.tempPassword && (
                          <button
                            onClick={() => navigator.clipboard.writeText(`Email: ${p.email}\nPassword: ${p.tempPassword}`)}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                            title="Copy credentials"
                          >
                            <Copy className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {importResult.providers.filter((p) => p.reason === 'email_conflict').length > 0 && (
            <div className="px-5 py-3 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-emergency)' }}>
              <strong>Email conflicts (manual action needed):</strong>{' '}
              {importResult.providers.filter((p) => p.reason === 'email_conflict').map((p) => p.email).join(', ')}
              <span className="block mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                These OpenEMR practitioners share an email with an existing HHA account. Resolve manually in Users before re-importing.
              </span>
            </div>
          )}
          <p className="px-5 py-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Share the temp password with each provider. They can change it after first login.
          </p>
        </div>
      )}

      <div className="relative max-w-xs mb-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <FormInput
          placeholder="Search by name or specialty…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <p className="text-center text-sm py-8" style={{ color: 'var(--color-text-muted)' }}>
            No providers found
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((prov) => (
            <div key={prov.id} className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => setSelected(prov)}>
            <Card className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: '#6DC43F22', color: '#6DC43F' }}
                >
                  {getInitials(prov.firstName, prov.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {prov.title} {prov.firstName} {prov.lastName}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {prov.specialty}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>
                    {prov.email}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {prov.totalPatients} patients
                  </span>
                </div>
                {prov.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#F5A623' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {prov.rating}
                    </span>
                  </div>
                )}
              </div>

              {/* Verification row — only shown when pending, so verified
                  providers don't carry extra chrome they don't need. */}
              {prov.isVerified === false && (
                <div
                  className="flex items-center justify-between gap-2 mt-auto px-2.5 py-2 rounded-lg"
                  style={{ background: 'rgba(245, 166, 35, 0.10)' }}
                >
                  <Pill variant="warning">Pending verify</Pill>
                  {isAdmin && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={verifying === prov.id}
                      onClick={(e) => { e.stopPropagation(); handleVerify(prov.id) }}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-1.5">
                  {prov.isVerified !== false && <Pill variant="success">Verified</Pill>}
                  <Pill variant={prov.isAvailable ? 'success' : 'neutral'}>
                    {prov.isAvailable ? 'Available' : 'Unavailable'}
                  </Pill>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(prov.id, prov.isAvailable) }}
                  disabled={toggling === prov.id}
                  className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 disabled:opacity-60"
                  style={{
                    background: prov.isAvailable ? '#6DC43F' : 'var(--color-border)',
                  }}
                  aria-label={prov.isAvailable ? 'Set unavailable' : 'Set available'}
                  aria-checked={prov.isAvailable}
                  role="switch"
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: prov.isAvailable ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between mt-4 px-4 py-3 rounded-2xl border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages} · {total} providers
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

      {selected && <ProviderDetailDialog provider={selected} onClose={() => setSelected(null)} />}
      {createOpen && <CreateProviderDialog onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  )
}

// Email-as-lookup typeahead. Debounces the admin search by 300ms, fans
// out to adminApi.users.list, and renders a dropdown of matching users
// with a clear flag for ones who already have a provider profile so the
// admin doesn't pick a duplicate. On select, the parent gets the full
// AdminUser so it can pre-fill the name fields.
function UserPicker({
  selected,
  onPick,
  onClear,
}: {
  selected: AdminUser | null
  onPick: (user: AdminUser) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click — standard typeahead behaviour.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await adminApi.users.list({ search: query.trim(), limit: 10 })
        setResults(res.data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  if (selected) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Target User
        </label>
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          <div className="min-w-0">
            <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
              {selected.fullName ?? selected.email}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
              {selected.email} · role: {selected.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] underline"
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 relative" ref={containerRef}>
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Target User
      </label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by email or name…"
          className="w-full h-10 pl-9 pr-3 rounded-xl text-sm border outline-none focus:border-[#6DC43F]"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          autoComplete="off"
        />
      </div>

      {open && (loading || results.length > 0 || (query.trim().length >= 2 && !loading)) && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl border z-10 max-h-72 overflow-y-auto"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {loading && (
            <p className="text-xs px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-xs px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>No matches</p>
          )}
          {!loading && results.map((u) => {
            const alreadyProvider = !!u.provider
            return (
              <button
                key={u.id}
                type="button"
                disabled={alreadyProvider}
                onClick={() => {
                  if (alreadyProvider) return
                  onPick(u)
                  setOpen(false)
                  setQuery('')
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] border-b last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)', background: 'transparent' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                      {u.fullName ?? u.email}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {u.email} · role: {u.role}
                    </p>
                  </div>
                  {alreadyProvider && <Pill variant="neutral">Already provider</Pill>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Compact modal: admin picks the target user via email/name typeahead,
// picks a provider type + specialty, optionally adds a license number,
// and submits. Row lands in the unverified state.
function CreateProviderDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [providerType, setProviderType] = useState('DOCTOR')
  const [specialization, setSpecialization] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When admin picks a user, pre-fill the first/last name fields from
  // their patient profile (if any) so they don't have to retype it.
  const handlePickUser = useCallback((user: AdminUser) => {
    setSelectedUser(user)
    if (!firstName && user.patient?.firstName) setFirstName(user.patient.firstName)
    if (!lastName && user.patient?.lastName) setLastName(user.patient.lastName)
    if (!firstName && !user.patient && user.fullName) {
      const parts = user.fullName.split(' ')
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' '))
    }
  }, [firstName, lastName])

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedUser) {
      setError('Pick the target user first.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }
    setSaving(true)
    try {
      await adminApi.providers.create({
        userId: selectedUser.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        providerType,
        specialization: specialization.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider')
    } finally {
      setSaving(false)
    }
  }, [selectedUser, firstName, lastName, providerType, specialization, licenseNumber, yearsOfExperience, onCreated])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Add Provider
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Promotes the target user to provider. Status starts as Pending — click Verify after reviewing credentials.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <UserPicker selected={selectedUser} onPick={handlePickUser} onClear={() => setSelectedUser(null)} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <FormInput label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Provider Type
            </label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
              className="h-10 px-3 rounded-xl text-sm border outline-none cursor-pointer"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="PHYSIOTHERAPIST">Physiotherapist</option>
              <option value="SPECIALIST">Specialist</option>
              <option value="RADIOLOGIST">Radiologist</option>
            </select>
          </div>
          <FormInput label="Specialty (optional)" placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="License / NPI (optional)" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            <FormInput label="Years of experience" type="number" min={0} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-emergency)' }}>{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="md" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" size="md" loading={saving} type="submit">Add Provider</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
