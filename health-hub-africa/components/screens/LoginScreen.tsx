'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, Shield, Activity, Cpu } from 'lucide-react'

export function LoginScreen() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (!agreeTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy')
        return
      }
      // Save name for personalized onboarding
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboarding_name', name || 'Valued Patient')
      }
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
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
        {/* Overlay to dim background and support contrast */}
        <div className="absolute inset-0 bg-[#001f0a]/20 dark:bg-black/45 backdrop-blur-[1px]" />

        {/* Glass Card */}
        <div
          className="relative z-10 w-full max-w-md p-6 md:p-8 rounded-[28px] border border-white/20 bg-white/5 dark:bg-black/15 backdrop-blur-2xl shadow-[0_24px_50px_rgba(0,0,0,0.25)] transition-all duration-300"
          style={{ '--form-label-color': 'rgba(255, 255, 255, 0.75)' } as React.CSSProperties}
        >
          {/* Card Header Brand Logo */}
          <div className="mb-6 flex flex-col gap-1">
            <img
              src="/logo-white.png"
              alt="Health-Hub Africa®"
              className="h-10 w-auto object-contain self-start"
            />
            <p className="text-[10px] ml-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>MyHealth Vault+™</p>
          </div>

          <h2 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-sm mb-6 text-white/70">
            {isSignUp ? 'Get started with your intelligent patient portal' : 'Sign in to your patient portal'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-xs bg-red-500/10 text-red-500 border border-red-500/20">
              {error}
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

            <Button type="submit" fullWidth size="lg" className="mt-2">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-center mt-6 text-white/70">
            {isSignUp ? 'Already have an account? ' : 'New to MyHealth Vault+™? '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="font-medium hover:underline focus:outline-none text-[#6DC43F]"
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

