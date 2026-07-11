'use client'

import { Button } from '@/components/ui/Button'
import type { IdleState } from '@/lib/hooks/useIdleLogout'

interface IdleWarningModalProps {
  idleState: IdleState
  remainingSeconds: number
  onContinue: () => void
}

export function IdleWarningModal({ idleState, remainingSeconds, onContinue }: IdleWarningModalProps) {
  if (idleState !== 'warning') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Still there?
          </h2>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            You've been inactive for a while. You'll be logged out automatically unless you continue your session.
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Logging out in {remainingSeconds}s
          </p>
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="primary" size="sm" onClick={onContinue}>
            Continue session
          </Button>
        </div>
      </div>
    </div>
  )
}
