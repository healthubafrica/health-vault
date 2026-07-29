'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Radio } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface NoInternetStateProps {
  onCheckConnection?: () => Promise<boolean> | void
  isOfflineSimulated?: boolean
  className?: string
}

export function NoInternetState({
  onCheckConnection,
  isOfflineSimulated = true,
  className = '',
}: NoInternetStateProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [pingResult, setPingResult] = useState<string | null>(null)

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : !isOfflineSimulated)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOfflineSimulated])

  const handlePing = async () => {
    setIsChecking(true)
    setPingResult(null)

    await new Promise((resolve) => setTimeout(resolve, 1200))

    if (onCheckConnection) {
      await onCheckConnection()
    }

    const currentOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : false
    setIsOnline(currentOnlineState)
    setPingResult(currentOnlineState ? 'Connection restored!' : 'Still offline. Please check your network.')
    setIsChecking(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`py-12 px-8 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-md ${className}`}
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-[var(--color-emergency-light)] flex items-center justify-center text-[var(--color-emergency)] shadow-inner">
          <WifiOff className="w-10 h-10" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl border-2 border-[var(--color-emergency)]"
        />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-emergency)] animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-emergency)]">
          No Internet Connection
        </span>
      </div>

      <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">You are currently offline</h2>
      <p className="text-xs text-[var(--color-text-muted)] max-w-sm mb-6 leading-relaxed">
        Health Hub Africa requires an active internet connection to synchronize patient records and real-time vitals.
      </p>

      <div className="w-full bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] mb-6 text-left space-y-2.5">
        <p className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">Troubleshooting steps:</p>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-2">
          <li className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
            Check your Wi-Fi router or cellular data signal
          </li>
          <li className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
            Toggle Airplane Mode off and on again
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />
            Your local drafts are saved and will sync once connected
          </li>
        </ul>
      </div>

      {pingResult && (
        <p className={`text-xs font-medium mb-4 ${isOnline ? 'text-[var(--color-success-text)]' : 'text-[var(--color-emergency)]'}`}>
          {pingResult}
        </p>
      )}

      <Button
        onClick={handlePing}
        disabled={isChecking}
        className="w-full sm:w-auto px-8 gap-2 bg-[var(--color-primary)] hover:opacity-90"
      >
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking status...' : 'Check Connection'}
      </Button>
    </motion.div>
  )
}
