'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, Check, ArrowRight, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SuccessStateProps {
  title?: string
  message?: string
  referenceId?: string
  details?: { label: string; value: string }[]
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function SuccessState({
  title = 'Appointment Successfully Scheduled!',
  message = 'Your consultation request has been confirmed. A notification was dispatched to Dr. Benjamin Obire.',
  referenceId = 'HHA-2026-9482-X',
  details = [
    { label: 'Patient Name', value: 'Kofi Mensah' },
    { label: 'Department', value: 'Telecare Cardiology' },
    { label: 'Date & Time', value: 'Tomorrow at 10:30 AM GMT' },
    { label: 'Fee Status', value: 'Paid via Insurance' },
  ],
  primaryActionLabel = 'View Appointment',
  onPrimaryAction,
  secondaryActionLabel = 'Download Pass',
  onSecondaryAction,
  className = '',
}: SuccessStateProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (referenceId) {
      navigator.clipboard.writeText(referenceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`p-8 rounded-[32px] border border-[var(--color-success)]/30 bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-md relative overflow-hidden ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[var(--color-success)]/10 blur-2xl pointer-events-none" />

      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-16 h-16 rounded-2xl bg-[var(--color-success-bg)] flex items-center justify-center text-[var(--color-success-text)] mb-4 shadow-sm relative z-10"
      >
        <CheckCircle2 className="w-9 h-9 text-[var(--color-success)]" />
      </motion.div>

      <h3 className="text-lg font-bold text-[var(--color-text)] mb-1 z-10">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-xs mb-4 leading-relaxed z-10">
        {message}
      </p>

      {referenceId && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono mb-5 z-10">
          <span className="text-[var(--color-text-muted)] text-[11px]">REF:</span>
          <span className="font-bold text-[var(--color-text)]">{referenceId}</span>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors ml-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {details.length > 0 && (
        <div className="w-full p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-6 text-left space-y-2 z-10">
          {details.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-[var(--color-text-muted)]">{item.label}</span>
              <span className="font-semibold text-[var(--color-text)]">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full z-10">
        {secondaryActionLabel && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onSecondaryAction}
            className="flex-1 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {secondaryActionLabel}
          </Button>
        )}
        {primaryActionLabel && (
          <Button size="sm" onClick={onPrimaryAction} className="flex-1 gap-1.5">
            {primaryActionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}
