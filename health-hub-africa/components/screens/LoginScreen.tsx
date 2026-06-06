'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, Shield, Activity, Cpu } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'

// OTP verification step shown after registration
function OtpStep({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const [otp, setOtp] = useState('')
  const { verifyOtp, isLoading, error, clearError } = useAuthStore()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verifyOtp(email, otp)
      onSuccess()
    } catch {
      // error is set in store
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Verify your email
        </h2>
        <p className="text-sm text-white/70 mt-1">
          We sent a 6-digit code to <span className="font-medium text-white">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleVerify}>
        <FormInput
          label="Verification code"
          type="text"
          placeholder="123456"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          required
        />
        <Button type="submit" fullWidth size="lg" disabled={isLoading}>
          {isLoading ? 'Verifying…' : 'Verify & Continue'}
        </Button>
      </form>
    </div>
  )
}

export function LoginScreen() {
  const router = useRouter()
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [localError, setLocalError] = useState('')

  const displayError = localError || error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (isSignUp) {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match')
        return
      }
      if (!agreeTerms) {
        setLocalError('You must agree to the Terms of Service and Privacy Policy')
        return
      }
      try {
        await register(email, password)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('onboarding_name', name || 'Valued Patient')
          sessionStorage.setItem('pending_otp_email', email)
        }
        setShowOtp(true)
      } catch {
        // error shown via store
      }
    } else {
      try {
        await login(email, password)
        router.push('/dashboard')
      } catch {
        // error shown via store
      }
    }
  }

  const handleOtpSuccess = () => {
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Left — brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: '#006022' }}
      >
        <div>
          <div className="mb-10 flex flex-col gap-1">
            <img
              src="/logo-white.png"
              alt="Health-Hub Africa®"
              className="h-16 w-auto object-contain self-start"
            />
            <p className="text-white/50 text-[11px] ml-1">MyHealth Vault+™</p>
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Your health,<br />secured and connected.
          </h1>
          <p className="text-white/60 text-sm mt-3 leading-relaxed">
            Africa&apos;s leading intelligent patient portal — connecting patients, providers, and emergency services seamlessly.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { icon: Shield, label: 'Military-grade encryption', sub: 'All records encrypted at rest and in transit' },
            { icon: Activity, label: 'Real-time health monitoring', sub: 'Live vitals, alerts, and care updates' },
            { icon: Cpu, label: 'STRIDE™ AI Intelligence', sub: 'AI-powered triage and emergency dispatch' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10">
                <Icon size={14} className="text-[#6DC43F]" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-white/50 text-[11px] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div
        className="flex-1 flex items-center justify-center p-4 md:p-6 bg-cover bg-center relative"
        style={{ backgroundImage: "url('/auth-bg.png')" }}
      >
        <div className="absolute inset-0 bg-[#001f0a]/20 dark:bg-black/45 backdrop-blur-[1px]" />

        <div
          className="relative z-10 w-full max-w-md p-6 md:p-8 rounded-[28px] border border-white/20 bg-white/5 dark:bg-black/15 backdrop-blur-2xl shadow-[0_24px_50px_rgba(0,0,0,0.25)] transition-all duration-300"
          style={{ '--form-label-color': 'rgba(255, 255, 255, 0.75)' } as React.CSSProperties}
        >
          {!showOtp && (
            <div className="mb-6 flex flex-col gap-1">
              <img src="/logo-white.png" alt="Health-Hub Africa®" className="h-10 w-auto object-contain self-start" />
              <p className="text-[10px] ml-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>MyHealth Vault+™</p>
            </div>
          )}

          {showOtp ? (
            <OtpStep email={email} onSuccess={handleOtpSuccess} />
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {isSignUp ? 'Create account' : 'Welcome back'}
              </h2>
              <p className="text-sm mb-6 text-white/70">
                {isSignUp ? 'Get started with your intelligent patient portal' : 'Sign in to your patient portal'}
              </p>

              {displayError && (
                <div className="mb-4 p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                  {displayError}
                </div>
              )}

              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {isSignUp && (
                  <FormInput
                    label="Full name"
                    type="text"
                    placeholder="Bernard Okafor"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                )}

                <FormInput
                  label="Email address"
                  type="email"
                  placeholder="b.okafor@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <div className="relative">
                  <FormInput
                    label="Password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-8 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
                    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {isSignUp && (
                  <div className="relative">
                    <FormInput
                      label="Confirm password"
                      type={showConfirmPass ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPass(s => !s)}
                      className="absolute right-3 top-8 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex items-center justify-end">
                    <a href="#" className="text-xs font-medium hover:underline text-[#6DC43F]">
                      Forgot password?
                    </a>
                  </div>
                )}

                {isSignUp && (
                  <label className="flex items-start gap-2.5 cursor-pointer mt-1 select-none">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#6DC43F] rounded cursor-pointer"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                    />
                    <span className="text-[11px] leading-tight text-white/70">
                      I agree to the{' '}
                      <a href="#" className="font-semibold hover:underline text-[#6DC43F]">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="font-semibold hover:underline text-[#6DC43F]">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                <Button type="submit" fullWidth size="lg" className="mt-2" disabled={isLoading}>
                  {isLoading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create Account' : 'Sign In')}
                </Button>
              </form>

              <p className="text-xs text-center mt-6 text-white/70">
                {isSignUp ? 'Already have an account? ' : 'New to MyHealth Vault+™? '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setLocalError('')
                    clearError()
                  }}
                  className="font-medium hover:underline focus:outline-none text-[#6DC43F]"
                >
                  {isSignUp ? 'Sign in' : 'Create account'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
