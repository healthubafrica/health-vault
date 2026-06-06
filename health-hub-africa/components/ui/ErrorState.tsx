'use client'

import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  /** Compact variant for inline use inside a card */
  compact?: boolean
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
  const Icon = isOffline ? WifiOff : AlertCircle
  const title = isOffline ? 'You appear to be offline' : 'Something went wrong'
  const description = message ?? (isOffline
    ? 'Check your connection and try again.'
    : 'We couldn\'t load this data. Your other information is still available.'
  )

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-4 px-5 rounded-[16px] border border-[var(--color-error-bg)] bg-[var(--color-error-bg)]">
        <Icon size={16} className="text-[var(--color-error)] shrink-0" />
        <p className="text-xs font-medium text-[var(--color-error)] flex-1">{description}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--color-error-bg)]">
        <Icon size={22} className="text-[var(--color-error)]" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</p>
        <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="gap-1.5">
          <RefreshCw size={13} strokeWidth={2.5} />
          Try again
        </Button>
      )}
    </div>
  )
}
