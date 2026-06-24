'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react'

function safeRedirectTarget(raw: string | null): string {
  if (!raw) return '/overview'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/overview'
  return raw
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, verify2fa, isLoading, error, clearError, clearPending, isAuthenticated, pendingUserId } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(safeRedirectTarget(searchParams.get('from')))
    }
  }, [isAuthenticated, router, searchParams])

  // Focus OTP input when 2FA step appears
  useEffect(() => {
    if (pendingUserId) {
      setTimeout(() => otpRef.current?.focus(), 50)
    }
  }, [pendingUserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      // Redirect is driven entirely by the isAuthenticated effect above —
      // if requiresTwoFactor was set instead, the UI transitions to the OTP step.
    } catch {
      // error already set in store
    }
  }

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verify2fa(otp)
      // Redirect is driven by the isAuthenticated effect above.
    } catch {
      setOtp('')
      otpRef.current?.focus()
    }
  }

  const handleBack = () => {
    clearPending()
    setOtp('')
    setPassword('')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-outer-bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ShieldCheck className="w-6 h-6 text-[#6DC43F]" />
          </div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            HHA Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Internal staff access only
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {pendingUserId ? (
            /* ── Step 2: 2FA OTP ── */
            <>
              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="Back to sign in"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Two-factor verification
                </h2>
              </div>

              <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                A 6-digit code was sent to your email address. Enter it below to complete sign-in.
              </p>

              <form onSubmit={handleVerify2fa} className="flex flex-col gap-4">
                <div>
                  <FormInput
                    ref={otpRef}
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
                </div>

                {error && (
                  <div
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={otp.length !== 6}
                  className="mt-1 w-full"
                >
                  Verify
                </Button>
              </form>
            </>
          ) : (
            /* ── Step 1: Email + Password ── */
            <>
              <h2
                className="text-sm font-semibold mb-5"
                style={{ color: 'var(--color-text)' }}
              >
                Sign in to your account
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@healthhub.africa"
                  autoComplete="email"
                  required
                />

                <div className="relative">
                  <FormInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-7 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <div
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <Button type="submit" loading={isLoading} className="mt-1 w-full">
                  Sign in
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-faint)' }}>
          Health Hub Africa · Admin Panel · Internal Use Only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
