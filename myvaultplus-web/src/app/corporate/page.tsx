import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import AnimatedSection from '@/components/AnimatedSection'
import AnimatedCard from '@/components/AnimatedCard'
import { Users, Building2, Zap, Shield, Ambulance, Brain, BarChart3, UserCog, Pill, Home, GraduationCap, Landmark } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Users, title: 'Group Enrolment', desc: 'Enrol from 10 members upward with centralised account management.' },
  { icon: Building2, title: 'Full Portal Access', desc: 'Every enrolled member gets a complete MyHealth Vault+™ account.' },
  { icon: Zap, title: 'Priority Services', desc: 'All members receive priority access to TeleCare™ and DispatchCare™.' },
  { icon: Shield, title: 'Expert Review Credits', desc: 'Bulk Expert Review™ credits allocated across your organisation.' },
  { icon: Ambulance, title: 'Event Medical Coverage', desc: 'Dedicated DispatchCare™ coverage for events and gatherings.' },
  { icon: Brain, title: 'NeuroFlex Access', desc: 'Organisation-wide access to specialist neurology consultations.' },
  { icon: BarChart3, title: 'Usage Reporting', desc: 'Quarterly utilisation reports to help you manage your health benefits.' },
  { icon: UserCog, title: 'Account Management', desc: 'Dedicated account manager for seamless onboarding and ongoing support.' },
]

const audiences: Array<{ icon: LucideIcon; name: string; desc: string }> = [
  { icon: Building2, name: 'Employers', desc: 'Staff and dependent health coverage' },
  { icon: Pill, name: 'HMO Providers', desc: 'Digital health platform integration' },
  { icon: Home, name: 'Residential Estates', desc: 'Community health access for residents' },
  { icon: GraduationCap, name: 'Schools & Universities', desc: 'Student and staff healthcare benefits' },
  { icon: Landmark, name: 'Government Institutions', desc: 'Public sector employee coverage' },
]

const bentoCheckItems = [
  'Group enrolment from 10+ members',
  'Full access to all 7 services',
  'Priority TeleCare™ and DispatchCare™',
  'Expert Review™ credits for your team',
  'Dedicated account management',
]

export default function CorporatePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div className="page-card-first">
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=1920&h=1080&fit=crop&q=85" alt="Corporate healthcare" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div className="hero-content">
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Healthcare Benefits</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#6DC43F', letterSpacing: '-0.02em', lineHeight: 1.06 }}>That Actually Work.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Give your employees, members, or dependants access to a full digital health ecosystem; managed, measurable, and always available.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Plans
              </a>
              <a href="mailto:enquiries@healthubafrica.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Enquire Now
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — Features grid */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— What&apos;s Included</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Everything your{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>organisation gets.</em>
            </h2>
          </div>
          <AnimatedSection stagger className="rg-4">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <AnimatedCard key={feat.title} style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} strokeWidth={1.8} color="#137333" />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 15, color: '#07251C', margin: 0 }}>{feat.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{feat.desc}</p>
                </AnimatedCard>
              )
            })}
          </AnimatedSection>
        </section>
      </div>

      {/* Section 2 — Who this is for */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 18 }}>— Who It&apos;s For</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640, color: '#fff' }}>
              Built for{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, color: '#6DC43F' }}>organisations that care.</em>
            </h2>
          </div>
          <AnimatedSection stagger className="rg-5" style={{ gap: 12 }}>
            {audiences.map((aud) => {
              const Icon = aud.icon
              return (
                <AnimatedCard key={aud.name} style={{ background: '#0C3328', borderRadius: 18, padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
                  <span style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(109,196,63,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} strokeWidth={1.8} color="#6DC43F" />
                  </span>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 15, color: '#fff' }}>{aud.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{aud.desc}</div>
                </AnimatedCard>
              )
            })}
          </AnimatedSection>
        </section>
      </div>

      {/* Section 3 — Why bento */}
      <div className="page-card" style={{ background: '#F7FAF7' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Benefits</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Why organisations{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>choose us.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 360 }}>
            <div style={{ gridRow: '1 / 3', background: '#07251C', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 18 }}>Why Choose Us</div>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: '#fff', margin: '0 0 20px' }}>Built for organisations that take employee wellbeing seriously.</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bentoCheckItems.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(109,196,63,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" /></svg>
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(109,196,63,0.08)', border: '1px solid rgba(109,196,63,0.2)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Starting from <span style={{ color: '#6DC43F', fontWeight: 700 }}>10 members</span></div>
              </div>
            </div>
            <div style={{ gridRow: '1 / 3', background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.08)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
                <Image src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80" alt="Corporate healthcare team" fill style={{ objectFit: 'cover' }} sizes="400px" />
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#137333', marginBottom: 8 }}>Managed platform</div>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>A dedicated account team manages your enrolment, usage, and reporting.</p>
              </div>
            </div>
            <div style={{ background: '#6DC43F', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A4E3C' }}>Coverage</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 48, fontWeight: 700, color: '#07251C', letterSpacing: '-0.03em', lineHeight: 1 }}>7</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A4E3C', marginTop: 6 }}>Services included</div>
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6DC43F' }}>Support</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 48, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>24/7</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Operations & dispatch</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 4 — Enquiry form */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Enquire</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Ready to get{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>your team covered?</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, padding: '40px' }}>
              <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[{ label: 'Organisation Name', placeholder: 'Your company name' }, { label: 'Contact Name', placeholder: 'Your full name' }].map((f) => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>{f.label}</label>
                      <input type="text" placeholder={f.placeholder} style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Organisation Type</label>
                    <select style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }}>
                      <option>Employer</option>
                      <option>HMO Provider</option>
                      <option>Residential Estate</option>
                      <option>School / University</option>
                      <option>Government Institution</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Estimated Members</label>
                    <input type="number" placeholder="e.g. 50" style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[{ label: 'Email Address', type: 'email', placeholder: 'you@company.com' }, { label: 'Phone Number', type: 'tel', placeholder: '+234 XXX XXX XXXX' }].map((f) => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Message (optional)</label>
                  <textarea placeholder="Tell us more about your requirements..." rows={4} style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
                </div>
                <a href="mailto:enquiries@healthubafrica.com" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 100 }}>
                  Send Enquiry
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </a>
              </form>
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
