'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, ShieldAlert, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  code?: string
  errorDetails?: string
  onRetry?: () => void
  isRetrying?: boolean
  variant?: 'card' | 'inline' | 'full'
  className?: string
}

export function ErrorState({
  title = 'Failed to load clinical data',
  message = 'An unexpected error occurred while communicating with the provider service. Please check your credentials and try again.',
  code = 'ERR_ADMIN_500_INTERNAL',
  errorDetails = 'stack: AxiosError: Request failed with status code 500 at health-admin-api/v1/queue/fetch.ts:42',
  onRetry,
  isRetrying = false,
  variant = 'card',
  className = '',
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    if (onRetry) onRetry()
  }

  if (variant === 'inline') {
    return (
      <div className={`p-4 rounded-[16px] border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-500">{title}</p>
            <p className="text-[11px] text-red-500/80 line-clamp-1">{message}</p>
          </div>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRetry}
            disabled={isRetrying}
            className="shrink-0 text-[11px] h-8 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
    )
  }

  const isFull = variant === 'full'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${
        isFull
          ? 'py-16 px-6 min-h-[460px] rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-xl mx-auto'
          : 'p-8 rounded-[24px] border border-red-500/20 bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm'
      } ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4 shadow-sm relative">
        <ShieldAlert className="w-8 h-8" />
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[var(--color-surface)]" />
      </div>

      <span className="px-2.5 py-0.5 mb-2 text-[10px] font-mono font-bold tracking-wider rounded-md bg-red-500/10 text-red-500 uppercase">
        {code}
      </span>

      <h3 className="text-base font-bold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-sm mb-6 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <div className="flex items-center gap-3 mb-4">
          <Button size="sm" onClick={handleRetry} disabled={isRetrying} className="gap-2 bg-red-600 hover:opacity-90 text-white">
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Attempting Reconnect...' : 'Try Again'}
          </Button>

          {retryCount > 0 && (
            <span className="text-[11px] text-[var(--color-text-faint,#9CA3AF)]">
              Retried {retryCount} {retryCount === 1 ? 'time' : 'times'}
            </span>
          )}
        </div>
      )}

      {errorDetails && (
        <div className="w-full mt-2 text-left">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-muted)] py-1.5 hover:text-[var(--color-text)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Technical Diagnostics
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 text-[10px] font-mono rounded-xl bg-black/90 text-green-400 overflow-x-auto max-h-36 border border-white/10 leading-relaxed"
              >
                {errorDetails}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
