'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { patients, subscriptions, type SubscriptionPlan } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  Heart,
  Dna,
  ShieldCheck,
  Activity,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Key,
  CheckCircle2,
  Lock,
  Phone,
  Flame,
  Fingerprint,
  Check,
} from 'lucide-react'

// Avatar Options
const AVATAR_OPTIONS = [
  { id: 'care_receiver', label: 'Care Receiver', icon: Heart, desc: 'Receive chronic care and regular vitals monitoring.', color: '#EF4444' },
  { id: 'wellness_pioneer', label: 'Wellness Pioneer', icon: Dna, desc: 'Proactive wellness, genetic monitoring, and fitness.', color: '#3B82F6' },
  { id: 'vault_guardian', label: 'Vault Guardian', icon: ShieldCheck, desc: 'Focus heavily on military-grade vault encryption and privacy.', color: '#10B981' },
  { id: 'vitals_sentinel', label: 'Vitals Sentinel', icon: Flame, desc: 'Real-time sync with smartwatches and emergency triggers.', color: '#F59E0B' },
]

function getPriceKobo(plan: SubscriptionPlan, cycle: 'monthly' | 'annually'): number {
  if (cycle === 'annually') {
    if (plan.launchPriceKobo && plan.launchPriceKobo > 0) return plan.launchPriceKobo
    return plan.annualPriceKobo ?? plan.priceKobo * 12
  }
  return plan.priceKobo
}

export function OnboardingScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Prefill name from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('onboarding_name')
      if (storedName) {
        setName(storedName)
      }
    }
  }, [])

  // Fetch plans when the user reaches Step 5
  useEffect(() => {
    if (step !== 5) return
    if (plans.length > 0) return  // already loaded — skip on back-navigation
    let cancelled = false
    setPlansLoading(true)
    setPlansError('')
    subscriptions.listPlans()
      .then(res => { if (!cancelled) setPlans(res.data ?? []) })
      .catch((e: unknown) => {
        if (!cancelled) setPlansError(e instanceof Error ? e.message : 'Could not load plans. Please try again.')
      })
      .finally(() => { if (!cancelled) setPlansLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Step 1: Profile Info
  const [selectedAvatar, setSelectedAvatar] = useState('care_receiver')

  // Step 2: Basic Vitals
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Female')
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [allergies, setAllergies] = useState('')

  // Step 3: Medical Background
  const [chronicConditions, setChronicConditions] = useState<string[]>([])
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [healthId, setHealthId] = useState('')

  // Step 4: PIN Security
  const [pin, setPin] = useState<string[]>([])
  const [confirmPin, setConfirmPin] = useState<string[]>([])
  const [isConfirmingPin, setIsConfirmingPin] = useState(false)
  const [pinError, setPinError] = useState('')

  // Step 5: Plan Selection
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly')
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [planError, setPlanError] = useState('')

  const handleChronicToggle = (condition: string) => {
    if (chronicConditions.includes(condition)) {
      setChronicConditions(chronicConditions.filter(c => c !== condition))
    } else {
      setChronicConditions([...chronicConditions, condition])
    }
  }

  // Keypad Handlers
  const handleKeyPress = (num: string) => {
    setPinError('')
    if (!isConfirmingPin) {
      if (pin.length < 4) {
        const nextPin = [...pin, num]
        setPin(nextPin)
        if (nextPin.length === 4) {
          setTimeout(() => {
            setIsConfirmingPin(true)
          }, 300)
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const nextConfirm = [...confirmPin, num]
        setConfirmPin(nextConfirm)
        if (nextConfirm.length === 4) {
          setTimeout(() => {
            const entered = pin.join('')
            const reentered = nextConfirm.join('')
            if (entered === reentered) {
              setStep(5)
            } else {
              setPinError("Your PINs don't match. Kindly try again.")
              setPin([])
              setConfirmPin([])
              setIsConfirmingPin(false)
            }
          }, 400)
        }
      }
    }
  }

  const handleKeyClear = () => {
    if (!isConfirmingPin) {
      setPin(pin.slice(0, -1))
    } else {
      setConfirmPin(confirmPin.slice(0, -1))
    }
  }

  const renderProgress = () => {
    const steps = [
      { name: 'Profile',  label: '1' },
      { name: 'Vitals',   label: '2' },
      { name: 'History',  label: '3' },
      { name: 'Security', label: '4' },
      { name: 'Plans',    label: '5' },
      { name: 'Ready',    label: '6' },
    ]

    return (
      <div className="flex lg:flex-col lg:gap-8 justify-between lg:justify-start items-center lg:items-start w-full lg:w-48 mb-8 lg:mb-0 lg:mr-8 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
        {steps.map((s, idx) => {
          const currentIdx = idx + 1
          const isActive = step === currentIdx
          const isDone = step > currentIdx

          return (
            <div key={s.name} className="flex items-center gap-3 w-full lg:mb-2 justify-center lg:justify-start">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-[#6DC43F] text-white shadow-[0_0_12px_rgba(109,196,63,0.5)] scale-110'
                    : isDone
                    ? 'bg-[#6DC43F]/20 text-[#6DC43F] border border-[#6DC43F]'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {isDone ? '✓' : s.label}
              </div>
              <span
                className={`hidden lg:inline text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                  isActive ? 'text-white font-bold' : isDone ? 'text-[#6DC43F]' : 'text-white/40'
                }`}
              >
                {s.name}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Animation Variant
  const slideVariants = {
    initial: { opacity: 0, x: 15 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -15, transition: { duration: 0.2 } },
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-[#051108] via-[#0b1b0d] to-[#040e06]">
      <div className="w-full max-w-4xl min-h-[560px] flex flex-col lg:flex-row p-6 md:p-8 bg-[#0d1f11]/85 border border-white/5 shadow-2xl backdrop-blur-xl rounded-[24px]">
        
        {/* Step Indicator Panel */}
        {renderProgress()}

        {/* Content Panel */}
        <div className="flex-1 flex flex-col justify-between pt-2">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1"
            >
              {/* STEP 1: IDENTITY PROFILE */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    Welcome, {name || 'Patient'}!
                  </h2>
                  <p className="text-xs text-white/50 mb-6">
                    Confirm your patient persona to customize your portal experiences.
                  </p>

                  <div className="mb-4">
                    <FormInput
                      label="Confirm Preferred Name"
                      type="text"
                      placeholder="e.g. Bernard"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">
                    Select Your Health Avatar Persona
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {AVATAR_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      const isSelected = selectedAvatar === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedAvatar(opt.id)}
                          type="button"
                          className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                            isSelected
                              ? 'bg-white/10 border-[#6DC43F] shadow-[0_0_12px_rgba(109,196,63,0.15)]'
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div
                            className="p-2 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: `${opt.color}20` }}
                          >
                            <Icon size={16} style={{ color: opt.color }} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{opt.label}</p>
                            <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: BASIC VITALS */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    Vitals Configuration
                  </h2>
                  <p className="text-xs text-white/50 mb-6">
                    Enter basic health parameters to construct your encrypted records vault.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <FormInput
                      label="Date of Birth"
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                    />

                    <FormSelect
                      label="Biological Gender"
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </FormSelect>

                    <FormSelect
                      label="Blood Group"
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                    >
                      <option value="O+">O+ (Universal Donor)</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+ (Universal Receiver)</option>
                      <option value="AB-">AB-</option>
                    </FormSelect>

                    <FormInput
                      label="Known Allergies"
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts, None"
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: MEDICAL BACKGROUND */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    Medical Context
                  </h2>
                  <p className="text-xs text-white/50 mb-6">
                    Help emergency responder services like DispatchCare™ verify critical details in crisis events.
                  </p>

                  <div className="mb-4">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">
                      Chronic Medical Conditions (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['Hypertension', 'Asthma', 'Diabetes', 'Heart Disease', 'Arthritis', 'None'].map(condition => {
                        const isSelected = chronicConditions.includes(condition)
                        return (
                          <button
                            key={condition}
                            type="button"
                            onClick={() => handleChronicToggle(condition)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none ${
                              isSelected
                                ? 'bg-[#6DC43F]/20 text-[#6DC43F] border-[#6DC43F]'
                                : 'bg-white/5 text-white/50 border-white/5 hover:border-white/10'
                            }`}
                          >
                            {condition}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormInput
                      label="Emergency Contact Full Name"
                      type="text"
                      placeholder="Chioma Okafor"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      required
                    />

                    <FormInput
                      label="Emergency Contact Phone"
                      type="tel"
                      placeholder="+234 803 123 4567"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <FormInput
                      label="National Healthcare ID / Insurance No."
                      type="text"
                      placeholder="e.g. your national ID or insurance number"
                      hint="Optional — enter your national health insurance or ID number if you have one, to help verify insurance claims."
                      value={healthId}
                      onChange={e => setHealthId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: VAULT SECURITY (PIN PAD) */}
              {step === 4 && (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#6DC43F]/15 mb-3 text-[#6DC43F]">
                    <Lock size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-white text-center mb-1">
                    {isConfirmingPin ? 'Confirm Vault PIN' : 'Encrypt your Vault'}
                  </h2>
                  <p className="text-xs text-white/50 text-center max-w-xs mb-5">
                    {isConfirmingPin
                      ? 'Re-enter your 4-digit PIN to lock in details.'
                      : 'Set a 4-digit PIN to secure records. This PIN encrypts patient-identifiable data.'}
                  </p>

                  {/* Bullet indicators */}
                  <div className="flex gap-4 mb-6">
                    {[0, 1, 2, 3].map(index => {
                      const list = isConfirmingPin ? confirmPin : pin
                      const isFilled = list.length > index
                      return (
                        <div
                          key={index}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                            isFilled
                              ? 'bg-[#6DC43F] border-[#6DC43F] scale-110 shadow-[0_0_8px_rgba(109,196,63,0.6)]'
                              : 'border-white/20 bg-transparent'
                          }`}
                        />
                      )
                    })}
                  </div>

                  {pinError && (
                    <p className="text-xs text-red-500 mb-4 font-semibold text-center">{pinError}</p>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-[200px] w-full">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        onClick={() => handleKeyPress(num)}
                        type="button"
                        className="w-14 h-11 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={handleKeyClear}
                      type="button"
                      className="w-14 h-11 text-[10px] uppercase font-bold rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/50 hover:text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handleKeyPress('0')}
                      type="button"
                      className="w-14 h-11 text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer"
                    >
                      0
                    </button>
                    <div className="w-14 h-11 flex items-center justify-center">
                      <Fingerprint size={16} className="text-[#6DC43F]/40" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CHOOSE YOUR PLAN */}
              {step === 5 && (
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    Choose Your Plan
                  </h2>
                  <p className="text-xs text-white/50 mb-4">
                    Start free and upgrade anytime, or pick the care tier that fits your health goals.
                  </p>

                  {/* Loading skeletons */}
                  {plansLoading && (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-2.5">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1.5">
                              <SkeletonBox className="h-3.5 w-24 rounded" />
                              <SkeletonBox className="h-2.5 w-32 rounded" />
                            </div>
                            <SkeletonBox className="h-5 w-16 rounded" />
                          </div>
                          <SkeletonBox className="h-2.5 w-full rounded" />
                          <SkeletonBox className="h-2.5 w-4/5 rounded" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error state */}
                  {!plansLoading && plansError && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <p className="text-xs text-red-400 text-center">{plansError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPlansError('')
                          setPlans([])
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Plans loaded */}
                  {!plansLoading && !plansError && plans.length > 0 && (
                    <>
                      {/* Billing toggle */}
                      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 self-start mb-4">
                        {(['monthly', 'annually'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setBillingCycle(mode)}
                            className={`text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                              billingCycle === mode
                                ? 'bg-white text-[#0d1f11]'
                                : 'bg-transparent text-white/50 hover:text-white/80'
                            }`}
                          >
                            {mode === 'monthly' ? 'Monthly' : 'Annual · Save ~20%'}
                          </button>
                        ))}
                      </div>

                      {/* Plan cards */}
                      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[260px] pr-1">
                        {plans.map(plan => {
                          const isSelected = selectedPlanId === plan.id
                          const isFree = plan.tier === 'Free'
                          const priceKobo = getPriceKobo(plan, billingCycle)
                          const priceDisplay = isFree ? '₦0' : formatCurrency(priceKobo / 100)
                          const periodLabel = isFree
                            ? 'Pay per use'
                            : billingCycle === 'annually' ? '/year' : '/month'
                          const topFeatures = Array.isArray(plan.features) ? plan.features.slice(0, 3) : []

                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 w-full ${
                                isSelected
                                  ? 'bg-white/10 border-[#6DC43F] shadow-[0_0_12px_rgba(109,196,63,0.15)]'
                                  : 'bg-white/5 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <p className="text-xs font-bold text-white">{plan.name}</p>
                                  {plan.isMostPopular && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#6DC43F]/20 text-[#6DC43F]">
                                      Most Popular
                                    </span>
                                  )}
                                  {plan.isBestValue && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                                      Best Value
                                    </span>
                                  )}
                                </div>
                                {plan.bestFor && (
                                  <p className="text-[10px] text-white/40 mb-1.5">Best for {plan.bestFor}</p>
                                )}
                                {topFeatures.length > 0 && (
                                  <ul className="flex flex-col gap-0.5">
                                    {topFeatures.map(f => (
                                      <li key={f} className="flex items-start gap-1.5">
                                        <Check size={10} className="text-[#6DC43F] mt-0.5 shrink-0" />
                                        <span className="text-[10px] text-white/50 leading-relaxed">{f}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="flex flex-col items-end shrink-0 gap-1">
                                <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                                  {priceDisplay}
                                </span>
                                <span className="text-[10px] text-white/40">{periodLabel}</span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-[#6DC43F] flex items-center justify-center mt-1">
                                    <Check size={9} className="text-white" />
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {planError && (
                        <p className="text-xs text-red-400 mt-3 text-center">{planError}</p>
                      )}

                      {/* CTAs */}
                      <div className="flex flex-col gap-2 mt-4 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(4)}
                            className="flex items-center gap-1"
                          >
                            <ArrowLeft size={13} /> Back
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!selectedPlanId || planSubmitting}
                            onClick={async () => {
                              const plan = plans.find(p => p.id === selectedPlanId)
                              if (!plan) return
                              const isFree = plan.tier === 'Free'
                              setPlanSubmitting(true)
                              setPlanError('')
                              try {
                                if (isFree) {
                                  await subscriptions.subscribe(plan.id, 'monthly')
                                  setStep(6)
                                } else {
                                  const res = await subscriptions.upgrade(plan.id, billingCycle)
                                  window.location.href = res.authorizationUrl
                                }
                              } catch (e: unknown) {
                                setPlanError(e instanceof Error ? e.message : 'Could not process. Please try again.')
                                setPlanSubmitting(false)
                              }
                            }}
                            className="flex items-center gap-1 text-xs flex-1"
                          >
                            {planSubmitting ? (
                              'Processing…'
                            ) : !selectedPlanId ? (
                              'Select a Plan'
                            ) : plans.find(p => p.id === selectedPlanId)?.tier === 'Free' ? (
                              <><span>Continue</span><ArrowRight size={13} /></>
                            ) : (
                              <><span>Proceed to Payment</span><ArrowRight size={13} /></>
                            )}
                          </Button>
                        </div>
                        {/* Escape hatch — always available */}
                        {plans.some(p => p.tier === 'Free') && (
                          <button
                            type="button"
                            disabled={planSubmitting}
                            onClick={async () => {
                              const freePlan = plans.find(p => p.tier === 'Free')
                              if (!freePlan) return
                              setPlanSubmitting(true)
                              setPlanError('')
                              try {
                                await subscriptions.subscribe(freePlan.id, 'monthly')
                                setStep(6)
                              } catch (e: unknown) {
                                setPlanError(e instanceof Error ? e.message : 'Could not activate free plan.')
                                setPlanSubmitting(false)
                              }
                            }}
                            className="text-[11px] text-white/40 hover:text-white/70 underline underline-offset-2 cursor-pointer text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Continue with Free Plan →
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 6: WELCOME & LAUNCH */}
              {step === 6 && (
                <div className="flex flex-col items-center py-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#6DC43F]/20 text-[#6DC43F] mb-3 shadow-[0_0_16px_rgba(109,196,63,0.3)]">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-white text-center mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    All Set, {name}!
                  </h2>
                  <p className="text-xs text-white/50 text-center max-w-sm mb-6">
                    Your personal health profile is encrypted and ready. Below is your vault credentials token summary.
                  </p>

                  {/* Summary Card */}
                  <div className="w-full max-w-sm p-4 rounded-xl border border-[#6DC43F]/20 bg-[#6DC43F]/5 flex flex-col gap-2.5 mb-6 text-xs text-white/80">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 font-medium">Patient Name</span>
                      <span className="font-semibold text-white">{name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 font-medium">Avatar Profile</span>
                      <span className="font-semibold text-[#6DC43F]">
                        {AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.label || 'Care Receiver'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 font-medium">Vitals Set</span>
                      <span className="font-semibold text-white">Blood {bloodGroup} / {gender}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 font-medium">Encryption Key</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Lock size={10} className="text-[#6DC43F]" /> AES-256 Enabled
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 font-medium">STRIDE™ AI Vitals Alert</span>
                      <span className="font-semibold text-white">Configured (Auto)</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls — Steps 1–3 and 6 only; Step 4 (PIN) and Step 5 (Plans) own their own nav */}
          {step !== 4 && step !== 5 && (
            <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-6">
              {step > 1 && step < 6 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Back
                </Button>
              ) : (
                <div />
              )}

              {step < 6 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={async () => {
                    // Submit patient profile after step 3
                    if (step === 3) {
                      setIsSubmitting(true)
                      setSubmitError('')
                      try {
                        const [firstName, ...rest] = name.trim().split(' ')
                        await patients.create({
                          firstName: firstName || name,
                          lastName: rest.join(' ') || 'Patient',
                          dateOfBirth: dob || '1990-01-01',
                          gender: gender === 'Male' ? 'Male' : gender === 'Female' ? 'Female' : 'Other',
                          bloodGroup: bloodGroup.replace('+', '_PLUS').replace('-', '_MINUS'),
                          regionCode: 'LAG',
                          country: 'Nigeria',
                          medicalInfo: {
                            allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
                            chronicConditions,
                          },
                          emergencyContacts: emergencyName && emergencyPhone ? [{
                            fullName: emergencyName,
                            relationship: 'Emergency Contact',
                            phone: emergencyPhone,
                            isPrimary: true,
                          }] : [],
                          ...(healthId.trim() ? { nin: healthId.trim() } : {}),
                        })
                        setStep(step + 1)
                      } catch (e: unknown) {
                        setSubmitError(e instanceof Error ? e.message : 'Failed to save profile. Please try again.')
                      } finally {
                        setIsSubmitting(false)
                      }
                    } else {
                      setStep(step + 1)
                    }
                  }}
                  className="flex items-center gap-1 text-xs"
                >
                  {isSubmitting ? 'Saving…' : <><span>Continue</span><ArrowRight size={13} /></>}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2"
                >
                  Enter Portal Dashboard <UserCheck size={16} />
                </Button>
              )}
              {submitError && (
                <p className="text-xs text-red-400 text-center w-full mt-2">{submitError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
