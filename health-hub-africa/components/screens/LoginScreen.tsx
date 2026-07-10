'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, Shield, Activity, Cpu } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'

// OTP verification step shown after registration
function OtpStep({ email, initialPhone, onSuccess }: { email: string; initialPhone: string; onSuccess: () => void }) {
  const [otp, setOtp] = useState('')
  const [phone, setPhone] = useState(initialPhone)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [localError, setLocalError] = useState('')
  const { verifyOtp, requestSmsOtp, isLoading, error, clearError } = useAuthStore()

  const displayError = localError || error

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    try {
      await verifyOtp(email, otp)
      onSuccess()
    } catch {
      // error is set in store
    }
  }

  const handleSendSms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLocalError('')
    clearError()
    if (showPhoneInput && !/^\+[1-9]\d{1,14}$/.test(phone)) {
      setLocalError('Kindly enter your phone number with the country code (for example +2348012345678).')
      return
    }
    try {
      await requestSmsOtp(email, phone || undefined)
      setSmsSent(true)
      setShowPhoneInput(false)
      setLocalError('')
    } catch (err: any) {
      const errMsg = err?.message || ''
      if (errMsg.toLowerCase().includes('phone number required')) {
        setShowPhoneInput(true)
      }
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

      {displayError && (
        <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20 whitespace-pre-line">
          {displayError}
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

      <div className="text-center mt-2 flex flex-col gap-2">
        {smsSent ? (
          <p className="text-xs text-[#6DC43F] font-semibold">
            ✓ Code sent via SMS!
          </p>
        ) : showPhoneInput ? (
          <form onSubmit={handleSendSms} className="flex flex-col gap-3 text-left">
            <FormInput
              label="Enter phone number for SMS OTP"
              type="tel"
              placeholder="+2348012345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? 'Sending SMS…' : 'Send SMS OTP'}
            </Button>
            <button
              type="button"
              onClick={() => setShowPhoneInput(false)}
              className="text-xs text-white/50 hover:underline"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => handleSendSms()}
            disabled={isLoading}
            className="text-xs font-medium hover:underline focus:outline-none text-[#6DC43F] cursor-pointer"
          >
            Didn't get the email? Resend via SMS
          </button>
        )}
      </div>
    </div>
  )
}

export function LoginScreen() {
  const router = useRouter()
  const { login, register, forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [localError, setLocalError] = useState('')

  // Forgot password states
  const [forgotState, setForgotState] = useState<'none' | 'email' | 'otp' | 'success'>('none')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false)

  const displayError = localError || error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (isSignUp) {
      if (password !== confirmPassword) {
        setLocalError("Your passwords don't match. Kindly check and try again.")
        return
      }
      if (!agreeTerms) {
        setLocalError('Kindly accept the Terms of Service and Privacy Policy to continue.')
        return
      }
      if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
        setLocalError('Kindly enter your phone number with the country code (for example +2348012345678).')
        return
      }
      // SEC-003: validate password strength client-side to show clear feedback before hitting the API
      const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/
      if (!PASSWORD_REGEX.test(password)) {
        setLocalError('Your password needs at least 12 characters with a mix of uppercase, lowercase, a number, and a symbol.')
        return
      }
      try {
        await register(email, password, phone || undefined, name || undefined)
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

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    try {
      await forgotPassword(forgotEmail)
      setForgotState('otp')
    } catch {
      // error shown via store
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (newPassword !== confirmNewPassword) {
      setLocalError("Your passwords don't match. Kindly check and try again.")
      return
    }
    // SEC-003: strict password verification matching backend
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/
    if (!PASSWORD_REGEX.test(newPassword)) {
      setLocalError('Your password needs at least 12 characters with a mix of uppercase, lowercase, a number, and a symbol.')
      return
    }
    try {
      await resetPassword(forgotEmail, resetOtp, newPassword)
      setForgotState('success')
    } catch {
      // error shown via store
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
          <h1 className="text-3xl font-bold text-white leading-tight mt-0" style={{ fontFamily: 'var(--font-display)' }}>
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
            </div>
          )}

          {showOtp ? (
            <OtpStep email={email} initialPhone={phone} onSuccess={handleOtpSuccess} />
          ) : forgotState === 'email' ? (
            <>
              <h2 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Reset password
              </h2>
              <p className="text-sm mb-6 text-white/70">
                Enter your email address and we will send you an OTP to reset your password.
              </p>

              {displayError && (
                <div className="mb-4 p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                  {displayError}
                </div>
              )}

              <form className="flex flex-col gap-4" onSubmit={handleForgotEmailSubmit}>
                <FormInput
                  label="Email address"
                  type="email"
                  placeholder="b.okafor@email.com"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                />

                <Button type="submit" fullWidth size="lg" className="mt-2" disabled={isLoading}>
                  {isLoading ? 'Sending OTP…' : 'Send Reset Code'}
                </Button>
              </form>

              <p className="text-xs text-center mt-6 text-white/70">
                <button
                  onClick={() => {
                    setForgotState('none')
                    setLocalError('')
                    clearError()
                  }}
                  className="font-medium hover:underline focus:outline-none text-[#6DC43F]"
                >
                  Back to Sign In
                </button>
              </p>
            </>
          ) : forgotState === 'otp' ? (
            <>
              <h2 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Reset your password
              </h2>
              <p className="text-sm mb-6 text-white/70">
                Enter the OTP sent to <span className="font-semibold text-white">{forgotEmail}</span> and your new password.
              </p>

              {displayError && (
                <div className="mb-4 p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                  {displayError}
                </div>
              )}

              <form className="flex flex-col gap-4" onSubmit={handleResetPasswordSubmit}>
                <FormInput
                  label="Verification code (OTP)"
                  type="text"
                  placeholder="123456"
                  value={resetOtp}
                  onChange={e => setResetOtp(e.target.value)}
                  required
                />

                <div className="relative">
                  <FormInput
                    label="New Password"
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Min 12 chars, upper, lower, digit, special"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowNewPass(s => !s)}
                    className="absolute right-3 top-8 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="relative">
                  <FormInput
                    label="Confirm New Password"
                    type={showConfirmNewPass ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirmNewPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmNewPass(s => !s)}
                    className="absolute right-3 top-8 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showConfirmNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <Button type="submit" fullWidth size="lg" className="mt-2" disabled={isLoading}>
                  {isLoading ? 'Resetting password…' : 'Reset Password'}
                </Button>
              </form>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => {
                    setForgotState('email')
                    setLocalError('')
                    clearError()
                  }}
                  className="text-xs font-medium hover:underline focus:outline-none text-white/50 cursor-pointer"
                >
                  Change Email
                </button>
                <button
                  onClick={() => {
                    setForgotState('none')
                    setLocalError('')
                    clearError()
                  }}
                  className="text-xs font-medium hover:underline focus:outline-none text-[#6DC43F] cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          ) : forgotState === 'success' ? (
            <>
              <h2 className="text-2xl font-bold mb-2 text-[#6DC43F]" style={{ fontFamily: 'var(--font-display)' }}>
                Password Reset!
              </h2>
              <p className="text-sm mb-6 text-white/70">
                Your password has been successfully reset. You can now log in using your new credentials.
              </p>

              <Button
                type="button"
                fullWidth
                size="lg"
                onClick={() => {
                  setForgotState('none')
                  setIsSignUp(false)
                  setPassword('')
                  setConfirmPassword('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setResetOtp('')
                  setLocalError('')
                  clearError()
                }}
              >
                Go to Sign In
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-display)' }}>
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

                {isSignUp && (
                  <FormInput
                    label="Phone number (optional)"
                    type="tel"
                    placeholder="+2348012345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                )}

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
                    style={{ color: 'var(--color-text-muted)' }}
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
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email)
                        setForgotState('email')
                        setLocalError('')
                        clearError()
                      }}
                      className="text-xs font-medium hover:underline focus:outline-none text-[#6DC43F] cursor-pointer"
                    >
                      Forgot password?
                    </button>
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

          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Powered by
            </span>
            <img
              src="/health-hub-brand-white.png"
              alt="Health-Hub Africa®"
              className="h-9 w-auto object-contain opacity-70"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
