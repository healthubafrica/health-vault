import type { Metadata } from 'next'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import { Search, BarChart3, ClipboardList, CalendarCheck, Leaf, Link2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'


export const metadata: Metadata = {
  title: 'HealthConsult™ — Preventive Care | MyHealth Vault+™',
  description:
    'Personalised preventive care programmes that identify and manage your health risks before they become problems. Included in Growth and Enterprise plans.',
}

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Search,
    title: 'Personal Health Assessment',
    desc: 'An in-depth review of your health history, lifestyle, family risk factors, and personal goals.',
  },
  {
    icon: BarChart3,
    title: 'Risk Stratification',
    desc: 'Identify and quantify your personal health risks, prioritised by urgency and actionability.',
  },
  {
    icon: ClipboardList,
    title: 'Personalised Care Plan',
    desc: 'A structured, time-bound plan tailored to your risk profile, delivered to your Vault.',
  },
  {
    icon: CalendarCheck,
    title: 'Regular Check-Ins',
    desc: 'Scheduled follow-up sessions to review progress, adjust the plan, and maintain accountability.',
  },
  {
    icon: Leaf,
    title: 'Lifestyle Guidance',
    desc: 'Nutrition, exercise, sleep, stress, and mental health recommendations integrated into your plan.',
  },
  {
    icon: Link2,
    title: 'Vault Integration',
    desc: 'All sessions, plans, and progress notes connect directly to your MyVault™ health record.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Initial Assessment',
    desc: 'A comprehensive health history review with your assigned HealthConsult™ clinician, typically 45–60 minutes.',
  },
  {
    num: '02',
    title: 'Risk Report',
    desc: 'Receive a structured risk report identifying your key health priorities, ranked by clinical significance.',
  },
  {
    num: '03',
    title: 'Your Care Plan',
    desc: 'A personalised, time-bound health plan is created, reviewed with you, and saved to your Vault.',
  },
  {
    num: '04',
    title: 'Regular Sessions',
    desc: 'Scheduled check-ins, monthly or quarterly, to track progress, answer questions, and refine your plan.',
  },
]

const planRows = [
  { plan: 'Free / Starter', access: 'Not included', highlight: false },
  { plan: 'Growth', access: '✓ Included', highlight: true },
  { plan: 'Enterprise', access: 'Priority access', highlight: false },
  { plan: 'Corporate & HMO', access: 'Custom allocation', highlight: false },
]

const riskAreas = [
  'Cardiovascular Risk', 'Type 2 Diabetes', 'Hypertension', 'Obesity & Metabolic Syndrome',
  'Kidney Health', 'Mental Health', 'Cancer Screening Readiness', 'Nutritional Deficiencies',
]

export default function HealthConsultPage() {
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
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop&q=85"
            alt="Health consultation"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="100vw"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.82) 0%, rgba(7,37,28,0.68) 50%, rgba(4,18,12,0.85) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Preventive Care.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Built Around You.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              A personalised preventive care programme that identifies your health risks, builds a structured plan, and keeps you accountable through regular check-ins, all connected to your MyVault™ record.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>View Plans</a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Start Your Assessment
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>— What You Get</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 14px', maxWidth: 560, color: '#07251C' }}>
              Stay well. Not just{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>reactive.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} style={{ background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.07)', borderRadius: 20, padding: '28px 26px' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} strokeWidth={1.8} color="#0E8567" />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 16.5, color: '#07251C', margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Risk areas ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#34E0A0' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A4E3C', marginBottom: 14 }}>— Risk Areas</div>
              <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                We assess 8+ major health risk categories.
              </h2>
              <p style={{ color: '#0A4E3C', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Your HealthConsult™ assessment covers the leading chronic and lifestyle-driven health risks affecting Nigerians today.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {riskAreas.map((area) => (
                <span key={area} style={{ background: 'rgba(7,37,28,0.1)', borderRadius: 100, padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#07251C' }}>{area}</span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── How it works ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 14 }}>— How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 520, color: '#fff' }}>
              From assessment to{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#34E0A0' }}>lasting results.</em>
            </h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {steps.map((s) => (
                <div key={s.num} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,224,160,0.12)', borderRadius: 18, padding: '32px 28px' }}>
                  <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 34, fontWeight: 700, color: '#34E0A0', letterSpacing: '-0.02em', marginBottom: 14 }}>{s.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 17, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
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
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                Included in Growth{' '}
                <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>and above.</em>
              </h2>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
                HealthConsult™ is included in the Growth plan at ₦4,900/month and Enterprise plan, making proactive preventive care genuinely accessible.
              </p>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 12px 22px', borderRadius: 100 }}>
                See All Plans
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#34E0A0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
            <div style={{ background: '#DEDEDE', borderRadius: 20, padding: 12 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                {planRows.map((row, i) => (
                  <div key={row.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: row.highlight ? '#07251C' : '#fff', borderBottom: i < planRows.length - 1 ? '1px solid rgba(7,37,28,0.07)' : 'none' }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: row.highlight ? '#fff' : '#07251C' }}>{row.plan}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: row.highlight ? '#34E0A0' : row.access === 'Not included' ? '#7A8C84' : '#0E8567', background: row.highlight ? 'rgba(52,224,160,0.12)' : row.access === 'Not included' ? 'rgba(7,37,28,0.06)' : '#EAF7F1', padding: '5px 14px', borderRadius: 100 }}>{row.access}</span>
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
