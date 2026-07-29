'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, KeyRound, LogOut, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SessionExpiredStateProps {
  userEmail?: string
  timeoutSeconds?: number
  onReauthenticate?: (passcode: string) => Promise<boolean> | boolean
  onLogout?: () => void
  variant?: 'card' | 'modal'
  className?: string
}

export function SessionExpiredState({
  userEmail = 'dr.obire@healthhub.africa',
  timeoutSeconds = 60,
  onReauthenticate,
  onLogout,
  variant = 'card',
  className = '',
}: SessionExpiredStateProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds)
  const [passcode, setPasscode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onLogout) onLogout()
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, onLogout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode) {
      setErrorMsg('Please enter your passcode or password')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const success = onReauthenticate ? await onReauthenticate(passcode) : true
      if (success) {
        setIsSuccess(true)
      } else {
        setErrorMsg('Invalid passcode. Please try again.')
      }
    } catch {
      setErrorMsg('Authentication failed. Check details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-8 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-lg relative ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4 shadow-sm relative">
        <Lock className="w-8 h-8" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-ping" />
      </div>

      <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">Provider Session Timed Out</h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-xs mb-3">
        For clinical data protection, your provider session for{' '}
        <span className="font-semibold text-[var(--color-text)]">{userEmail}</span> has expired.
      </p>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-bg,#F4F6F5)] text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-5 border border-[var(--color-border)]">
        <span>Automatic logout in:</span>
        <span className="font-mono text-xs">{formatTime(secondsLeft)}</span>
      </div>

      {isSuccess ? (
        <div className="w-full p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Session Restored! Loading provider portal...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div>
            <div className="relative">
              <input
                type="password"
                placeholder="Enter password or 6-digit PIN"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 text-xs rounded-xl bg-[var(--color-bg,#F4F6F5)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary,#137333)] transition-all"
              />
              <KeyRound className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-3" />
            </div>
            {errorMsg && <p className="text-[11px] text-red-500 text-left mt-1 font-medium">{errorMsg}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onLogout}
              className="flex-1 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="flex-1 gap-1.5 bg-[var(--color-primary,#137333)] text-white">
              {isSubmitting ? 'Verifying...' : 'Unlock Portal'}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        {content}
      </div>
    )
  }

  return content
}
