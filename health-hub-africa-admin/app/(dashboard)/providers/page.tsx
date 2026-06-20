'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminProvider, type ImportProviderResult } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { RefreshCw, Search, Star, Users, Download, X, Copy } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
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
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportProviderResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const limit = 20

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
          {isSuperAdmin && (
            <Button variant="primary" size="sm" loading={importing} onClick={handleImport}>
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
            <Card key={prov.id} className="flex flex-col gap-4">
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

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Pill variant={prov.isAvailable ? 'success' : 'neutral'}>
                  {prov.isAvailable ? 'Available' : 'Unavailable'}
                </Pill>
                <button
                  onClick={() => handleToggle(prov.id, prov.isAvailable)}
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
    </div>
  )
}
