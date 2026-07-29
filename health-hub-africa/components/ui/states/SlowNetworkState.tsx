'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SignalLow, Gauge, Zap, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SlowNetworkStateProps {
  latencyMs?: number
  onEnableLiteMode?: (enabled: boolean) => void
  onRetry?: () => void
  variant?: 'banner' | 'card'
  className?: string
}

export function SlowNetworkState({
  latencyMs = 2840,
  onEnableLiteMode,
  onRetry,
  variant = 'card',
  className = '',
}: SlowNetworkStateProps) {
  const [liteMode, setLiteMode] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const toggleLiteMode = () => {
    const next = !liteMode
    setLiteMode(next)
    if (onEnableLiteMode) onEnableLiteMode(next)
  }

  const handleRetry = async () => {
    setIsRefreshing(true)
    if (onRetry) await onRetry()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  if (variant === 'banner') {
    return (
      <div className={`p-3 px-4 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] flex flex-wrap items-center justify-between gap-3 text-[var(--color-warning-text)] ${className}`}>
        <div className="flex items-center gap-2.5">
          <SignalLow className="w-4 h-4 text-[var(--color-warning)] animate-pulse shrink-0" />
          <span className="text-xs font-semibold">
            Slow network connection detected ({latencyMs}ms). Data may take longer to load.
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={toggleLiteMode}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[var(--color-warning)]/15 hover:bg-[var(--color-warning)]/25 transition-colors"
          >
            {liteMode ? 'Disable Lite Mode' : 'Enable Lite Mode'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-7 rounded-[28px] border border-[var(--color-warning)]/30 bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-warning-bg)] flex items-center justify-center text-[var(--color-warning-text)] mb-3">
        <SignalLow className="w-7 h-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] text-[11px] font-bold mb-2">
        <Gauge className="w-3.5 h-3.5" />
        High Latency: {latencyMs} ms
      </div>

      <h3 className="text-base font-bold text-[var(--color-text)] mb-1">Slow Connection Detected</h3>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5 max-w-xs">
        Your response is taking longer than expected due to network throttling. You can switch to Lite Mode to load text content first.
      </p>

      <div className="w-full p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-5 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-[var(--color-gold)]" />
          <div>
            <p className="text-xs font-bold text-[var(--color-text)]">Lite Bandwidth Mode</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Defers high-res media & images</p>
          </div>
        </div>

        <button
          onClick={toggleLiteMode}
          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${liteMode ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
          <motion.div
            animate={{ x: liteMode ? 20 : 0 }}
            className="w-5 h-5 rounded-full bg-white shadow-md"
          />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={handleRetry} disabled={isRefreshing} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Reload Data
        </Button>
      </div>
    </motion.div>
  )
}
