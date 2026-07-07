'use client'

import { useEffect, useState } from 'react'
import { adminApi, type ProviderSession, type AvailableProvider } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { User, X, CheckCircle, ArrowRightLeft } from 'lucide-react'
import { buildProviderDisplayName } from '@/lib/providerName'

export function TransferModal({
  session,
  onClose,
  onTransferred,
}: {
  session: ProviderSession
  onClose: () => void
  onTransferred: () => void
}) {
  const [providers, setProviders] = useState<AvailableProvider[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [transferring, setTransferring] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  useEffect(() => {
    setLoadingProviders(true)
    adminApi.providerTelecare
      .availableProviders()
      .then((data) => {
        setProviders(data)
        setLoadingProviders(false)
      })
      .catch(() => {
        setError('Could not load available providers')
        setLoadingProviders(false)
      })
  }, [])

  const handleTransfer = async () => {
    if (!selectedId) return
    setTransferring(true)
    setError(null)
    try {
      await adminApi.providerTelecare.transferSession(session.id, selectedId)
      onTransferred()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Transfer Session
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {patientName} · {session.hhaRef}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg mb-3"
              style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
            >
              {error}
            </p>
          )}

          {loadingProviders ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} height={52} className="rounded-xl" />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>
              No available providers at the moment
            </p>
          ) : (
            <div className="space-y-1.5">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Select a provider
              </p>
              {providers.map((p) => {
                const selected = selectedId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                    style={
                      selected
                        ? { background: 'rgba(109,196,63,0.08)', borderColor: '#6DC43F' }
                        : { background: 'var(--color-bg)', borderColor: 'var(--color-border)' }
                    }
                    aria-pressed={selected}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <User className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: selected ? '#6DC43F' : 'var(--color-text)' }}
                        >
                          {buildProviderDisplayName(p)}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {p.specialty}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle
                          className="w-4 h-4 ml-auto flex-shrink-0"
                          style={{ color: '#6DC43F' }}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={transferring}
            onClick={handleTransfer}
            disabled={!selectedId || transferring}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer
          </Button>
        </div>
      </div>
    </div>
  )
}
