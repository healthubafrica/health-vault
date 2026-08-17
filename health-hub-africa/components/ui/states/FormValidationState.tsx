'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, AlertTriangle, Eye, EyeOff, Info, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface FormValidationStateProps {
  className?: string
}

export function FormValidationState({ className = '' }: FormValidationStateProps) {
  const [email, setEmail] = useState('invalid-email-address')
  const [password, setPassword] = useState('Pass123!')
  const [notes, setNotes] = useState('Patient exhibits mild fever.')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Validation logic
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordStrength =
    password.length > 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
      ? 'Strong'
      : password.length > 5
      ? 'Medium'
      : 'Weak'

  const charLimit = 50
  const isNotesWarning = notes.length > charLimit - 10

  const errors = [
    !isEmailValid && 'Please enter a valid email address (e.g. user@domain.com)',
    passwordStrength === 'Weak' && 'Password must be at least 8 characters with numbers and special symbols',
  ].filter(Boolean) as string[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-7 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] max-w-lg mx-auto shadow-sm space-y-5 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text)]">Form Validation & Feedback</h3>
          <p className="text-xs text-[var(--color-text-muted)]">Interactive real-time validation states</p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          Live State
        </span>
      </div>

      {submitted && errors.length > 0 && (
        <div className="p-3.5 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-error)]">
            <AlertCircle className="w-4 h-4" />
            Please resolve the following errors:
          </div>
          <ul className="text-[11px] text-[var(--color-error)]/90 list-disc list-inside space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Field 1: Email Input with Invalid State */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[var(--color-text)] flex justify-between">
          <span>Medical Practitioner Email</span>
          <span className="text-[10px] text-[var(--color-error)] font-semibold">Required</span>
        </label>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--color-bg)] border transition-all ${
              !isEmailValid
                ? 'border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)]/20'
                : 'border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)]/20'
            }`}
          />
          <div className="absolute right-3 top-3">
            {!isEmailValid ? (
              <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
            )}
          </div>
        </div>
        {!isEmailValid && (
          <p className="text-[11px] text-[var(--color-error)] font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Enter a valid email format (name@clinic.com)
          </p>
        )}
      </div>

      {/* Field 2: Password with Strength Indicator */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[var(--color-text)]">Account Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-[var(--color-text-muted)]"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength Meter Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[var(--color-text-muted)] font-medium">Strength:</span>
            <span
              className={`font-bold ${
                passwordStrength === 'Strong'
                  ? 'text-[var(--color-success-text)]'
                  : passwordStrength === 'Medium'
                  ? 'text-[var(--color-warning-text)]'
                  : 'text-[var(--color-error)]'
              }`}
            >
              {passwordStrength}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[var(--color-border)] rounded-full overflow-hidden flex gap-1">
            <div
              className={`h-full flex-1 rounded-full ${
                passwordStrength === 'Weak' || passwordStrength === 'Medium' || passwordStrength === 'Strong'
                  ? passwordStrength === 'Weak'
                    ? 'bg-[var(--color-error)]'
                    : passwordStrength === 'Medium'
                    ? 'bg-[var(--color-warning)]'
                    : 'bg-[var(--color-success)]'
                  : 'bg-transparent'
              }`}
            />
            <div
              className={`h-full flex-1 rounded-full ${
                passwordStrength === 'Medium' || passwordStrength === 'Strong'
                  ? passwordStrength === 'Medium'
                    ? 'bg-[var(--color-warning)]'
                    : 'bg-[var(--color-success)]'
                  : 'bg-[var(--color-border)]'
              }`}
            />
            <div
              className={`h-full flex-1 rounded-full ${
                passwordStrength === 'Strong' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Field 3: Clinical Notes with Character Counter */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-bold text-[var(--color-text)]">
          <span>Clinical Brief</span>
          <span
            className={`text-[10px] font-mono ${
              notes.length > charLimit ? 'text-[var(--color-error)] font-bold' : isNotesWarning ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-text-faint)]'
            }`}
          >
            {notes.length}/{charLimit}
          </span>
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)]"
        />
      </div>

      <Button onClick={() => setSubmitted(true)} className="w-full">
        Validate & Submit Record
      </Button>
    </motion.div>
  )
}
