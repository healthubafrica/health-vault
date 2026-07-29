'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react'

// SEC-003: same policy as the API's RegisterDto / ResetPasswordDto
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledEmail = searchParams.get('email') ?? ''
  const { forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore()

  // Reset-code emails link straight here with ?email=, so we skip the
  // "enter your email" step when it's already known.
  const [step, setStep] = useState<'email' | 'otp' | 'success'>(prefilledEmail ? 'otp' : 'email')
  const [email, setEmail] = useState(prefilledEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [localError, setLocalError] = useState('')

  const displayError = localError || error

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    try {
      await forgotPassword(email)
      setStep('otp')
    } catch {
      // error shown via store
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (newPassword !== confirmPassword) {
      setLocalError("Your passwords don't match. Kindly check and try again.")
      return
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setLocalError('Your password needs at least 12 characters with a mix of uppercase, lowercase, a number, and a symbol.')
      return
    }
    try {
      await resetPassword(email, otp, newPassword)
      setStep('success')
    } catch {
      // error shown via store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-outer-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ShieldCheck className="w-6 h-6 text-[#6DC43F]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>HHA Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Reset your password</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {step === 'email' ? (
            <>
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Forgot your password?</h2>
              <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                Enter your email address and we&apos;ll send you a one-time code to reset your password.
              </p>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <FormInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@healthhub.africa"
                  autoComplete="email"
                  required
                />
                {displayError && (
                  <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }} role="alert">
                    {displayError}
                  </div>
                )}
                <Button type="submit" loading={isLoading} className="mt-1 w-full">
                  Send reset code
                </Button>
              </form>
            </>
          ) : step === 'otp' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Enter your reset code</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below with your new password.
              </p>
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <FormInput
                  label="Verification code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                  className="text-center tracking-widest text-lg font-mono"
                />
                <div className="relative">
                  <FormInput
                    label="New password"
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 12 chars, upper, lower, digit, special"
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-7 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <FormInput
                    label="Confirm new password"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((v) => !v)}
                    className="absolute right-3 top-7 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {displayError && (
                  <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }} role="alert">
                    {displayError}
                  </div>
                )}
                <Button type="submit" loading={isLoading} disabled={otp.length !== 6} className="mt-1 w-full">
                  Reset password
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Password reset</h2>
              <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Button type="button" onClick={() => router.push('/login')} className="w-full">
                Go to sign in
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-faint)' }}>
          <Link href="/login" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
