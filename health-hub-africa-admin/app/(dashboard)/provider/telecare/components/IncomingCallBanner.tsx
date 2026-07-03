'use client'

import type { ProviderSession } from '@/lib/api'
import { PhoneCall, PhoneOff, Loader2 } from 'lucide-react'

export function IncomingCallBanner({
  sessions,
  acceptingId,
  decliningId,
  onAccept,
  onDecline,
}: {
  sessions: ProviderSession[]
  acceptingId: string | null
  decliningId: string | null
  onAccept: (s: ProviderSession) => void
  onDecline: (s: ProviderSession) => void
}) {
  return (
    <div className="mb-5 space-y-2">
      {sessions.map((s) => {
        const patientName = s.patient
          ? `${s.patient.firstName} ${s.patient.lastName}`
          : 'A patient'
        const isAccepting = acceptingId === s.id
        const isDeclining = decliningId === s.id
        const busy = isAccepting || isDeclining

        return (
          <div
            key={s.id}
            className="rounded-xl px-4 py-3 flex items-center gap-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #6DC43F',
              boxShadow: '0 0 0 2px rgba(109,196,63,0.12)',
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(109,196,63,0.12)' }}
            >
              <PhoneCall className="w-4 h-4 animate-pulse" style={{ color: '#6DC43F' }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {patientName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                is requesting a consultation
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                disabled={busy}
                onClick={() => onDecline(s)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-error-bg, rgba(239,68,68,0.08))',
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: 'var(--color-emergency)',
                }}
                aria-label="Decline call"
              >
                {isDeclining ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PhoneOff className="w-3.5 h-3.5" />
                )}
                Decline
              </button>
              <button
                disabled={busy}
                onClick={() => onAccept(s)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(109,196,63,0.12)',
                  borderColor: '#6DC43F',
                  color: '#6DC43F',
                }}
                aria-label="Accept call"
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PhoneCall className="w-3.5 h-3.5" />
                )}
                Accept
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
