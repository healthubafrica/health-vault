'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Lock, ArrowLeft, Send, CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface PermissionDeniedStateProps {
  requiredRole?: string
  currentRole?: string
  onRequestAccess?: (reason: string) => Promise<void> | void
  onGoBack?: () => void
  className?: string
}

export function PermissionDeniedState({
  requiredRole = 'Chief Medical Officer / Admin',
  currentRole = 'General Practitioner (Read-Only)',
  onRequestAccess,
  onGoBack,
  className = '',
}: PermissionDeniedStateProps) {
  const [showModal, setShowModal] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    if (onRequestAccess) await onRequestAccess(requestReason)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSubmitting(false)
    setRequestSent(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-8 rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm relative ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm relative">
        <Lock className="w-8 h-8" />
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-red-600 text-white">
          403
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg)] text-[11px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)] mb-3">
        <UserCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        Current Role: {currentRole}
      </div>

      <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">Access Restricted</h3>
      <p className="text-xs text-[var(--color-text-muted)] max-w-xs mb-5 leading-relaxed">
        You don't have permission to access restricted patient telemetry and clinical override panels.
      </p>

      <div className="w-full p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-6 text-left space-y-1">
        <p className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider">Required Privilege Level:</p>
        <p className="text-xs font-semibold text-[var(--color-emergency)] flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {requiredRole}
        </p>
      </div>

      {requestSent ? (
        <div className="w-full p-3.5 rounded-2xl bg-[var(--color-success-bg)] text-[var(--color-success-text)] text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Access request submitted to Super Admin.
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {onGoBack && (
            <Button size="sm" variant="secondary" onClick={onGoBack} className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return Back
            </Button>
          )}
          <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Request Elevated Access
          </Button>
        </div>
      )}

      {/* Request Access Modal */}
      {showModal && !requestSent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm p-6 rounded-[24px] bg-[var(--color-surface)] border border-[var(--color-border)] text-left space-y-4 shadow-xl"
          >
            <h4 className="text-sm font-bold text-[var(--color-text)]">Request Permission Elevation</h4>
            <p className="text-xs text-[var(--color-text-muted)]">
              Specify your clinical reason for requesting access to {requiredRole}.
            </p>

            <form onSubmit={handleRequestSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Reason for requesting permission..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)]"
              />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
