import type { Metadata } from 'next'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import { Brain, ClipboardList, Lightbulb, Laptop, Building2, Link2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'


export const metadata: Metadata = {
  title: 'NeuroFlex™ — Specialist Neurology | MyHealth Vault+™',
  description:
    'Access board-certified neurologists for comprehensive assessments, diagnosis, and treatment planning. Available as an add-on for all MyVault+ plans.',
}

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Brain,
    title: 'Specialist Neurologists',
    desc: 'Access to board-certified, MDCN-registered neurological specialists with subspecialty expertise.',
  },
  {
    icon: ClipboardList,
    title: 'Comprehensive Assessments',
    desc: 'Full neurological evaluation covering history, symptom review, and imaging or lab result interpretation.',
  },
  {
    icon: Lightbulb,
    title: 'Treatment Planning',
    desc: 'Evidence-based treatment recommendations documented and stored in your MyVault™ record.',
  },
  {
    icon: Laptop,
    title: 'Remote-First',
    desc: 'Initial assessments and most follow-ups delivered via TeleCare™; no travel required.',
  },
  {
    icon: Building2,
    title: 'Referral Network',
    desc: 'Where in-person care is required, NeuroFlex™ coordinates referrals to partner neurology centres.',
  },
  {
    icon: Link2,
    title: 'Vault Integration',
    desc: 'All sessions, imaging reviews, and care plans are stored centrally in your MyVault™ record.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Submit a Referral',
    desc: 'Self-refer directly or attach a referral letter from your GP or treating physician via your Vault.',
  },
  {
    num: '02',
    title: 'Initial Consultation',
    desc: 'A neurologist reviews your case history and conducts a structured initial assessment via TeleCare™.',
  },
  {
    num: '03',
    title: 'Investigations',
    desc: 'The specialist coordinates required tests, imaging, or additional specialist input through CareTest™.',
  },
  {
    num: '04',
    title: 'Your Treatment Plan',
    desc: 'A comprehensive neurological care plan is delivered to your Vault with scheduled follow-up sessions.',
  },
]

const conditions = [
  'Headache & Migraine', 'Epilepsy & Seizures', 'Stroke & TIA', 'Multiple Sclerosis',
  'Parkinson\'s Disease', 'Neuropathy', 'Dementia & Cognitive Decline', 'Vertigo & Balance',
  'Movement Disorders', 'Spinal Cord Conditions', 'Neuromuscular Disease', 'Sleep Disorders',
]

const planRows = [
  { plan: 'Free / Starter', access: 'Add-on', highlight: false },
  { plan: 'Growth', access: 'Add-on', highlight: false },
  { plan: 'Enterprise', access: '✓ Included', highlight: true },
  { plan: 'Corporate & HMO', access: 'Custom allocation', highlight: false },
]

export default function NeuroFlexPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* ── Hero ── */}
      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section
          style={{
            position: 'relative',
            background: '#041E14',
            overflow: 'hidden',
            minHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1576671081837-49000212a370?w=1920&h=1080&fit=crop&q=85"
            alt="Neurology specialist"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="100vw"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.85) 0%, rgba(7,37,28,0.72) 50%, rgba(4,18,12,0.88) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Specialist Neurology.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#6DC43F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Expert. Accessible.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              NeuroFlex™ gives you direct access to board-certified neurologists, from first assessment to full treatment planning and follow-up, all delivered through MyHealth Vault+™.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>View Plans</a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Start a Referral
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* ── Features ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— What You Get</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 14px', maxWidth: 560, color: '#07251C' }}>
              Neurological care that meets you{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>where you are.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} style={{ background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.07)', borderRadius: 20, padding: '28px 26px' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} strokeWidth={1.8} color="#137333" />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 16.5, color: '#07251C', margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Conditions ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 14 }}>— Conditions Covered</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#fff' }}>
                12+ neurological conditions and subspecialties.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                NeuroFlex™ specialists manage the full breadth of neurological conditions, from common presentations to complex subspecialty cases.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {conditions.map((c) => (
                <span key={c} style={{ background: 'rgba(109,196,63,0.1)', border: '1px solid rgba(109,196,63,0.2)', borderRadius: 100, padding: '10px 18px', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>{c}</span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── How it works ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#F7FAF7' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 520, color: '#07251C' }}>
              From referral to care plan{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>in four steps.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 24, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {steps.map((s) => (
                <div key={s.num} style={{ background: '#fff', borderRadius: 18, padding: '32px 28px' }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 34, fontWeight: 700, color: '#6DC43F', letterSpacing: '-0.02em', marginBottom: 14 }}>{s.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#07251C', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Plans ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                Add-on for all plans.{' '}
                <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>Included in Enterprise.</em>
              </h2>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
                NeuroFlex™ is available as a flexible add-on for Starter and Growth plans, and fully included in Enterprise and Corporate & HMO plans.
              </p>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 12px 22px', borderRadius: 100 }}>
                See All Plans
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
            <div style={{ background: '#DEDEDE', borderRadius: 20, padding: 12 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                {planRows.map((row, i) => (
                  <div key={row.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: row.highlight ? '#07251C' : '#fff', borderBottom: i < planRows.length - 1 ? '1px solid rgba(7,37,28,0.07)' : 'none' }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: row.highlight ? '#fff' : '#07251C' }}>{row.plan}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: row.highlight ? '#6DC43F' : '#137333', background: row.highlight ? 'rgba(109,196,63,0.12)' : '#EAF7F1', padding: '5px 14px', borderRadius: 100 }}>{row.access}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
