import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroSplit from '@/components/HeroSplit'

const checkItems = [
  'Secure health records, always accessible',
  'Book care in 4 steps or fewer',
  'Emergency dispatch; one tap, any screen',
  'Specialist second opinions via Expert Review™',
]

const pillars = [
  { title: 'Patient-Centred Design', desc: 'Every feature is built around the patient experience, intuitive, fast, and always accessible from any device.' },
  { title: 'Clinical Accuracy', desc: 'Our specialist networks and review panels maintain the highest standards of clinical rigour in every interaction.' },
  { title: 'Data Sovereignty', desc: 'Your health data belongs to you, stored securely, NDPR-compliant, and never sold or shared without consent.' },
  { title: 'Scalable Infrastructure', desc: "Built on modern, scalable technology that grows with Nigeria's healthcare needs, from individual patients to enterprise." },
]

const layers = [
  { num: '01', title: 'MyHealth Vault+™ UI', desc: 'The patient-facing portal, health records, bookings, communications, and emergency dispatch in one secure interface.' },
  { num: '02', title: 'HHA Middleware', desc: 'Intelligent routing, authentication, FHIR R4 compliance, and real-time data synchronisation across all services.' },
  { num: '03', title: 'Clinical Infrastructure', desc: 'Hospital integrations, specialist networks, lab partnerships, and emergency operations, the backbone of care delivery.' },
]


export default function AboutPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar forceScrolled />
      <div style={{ height: 80 }} />

      <HeroSplit
        heading={
          <>
            <span style={{ display: 'block' }}>About MyHealth Vault+™</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', color: '#137333' }}>by Health-Hub Africa®</span>
          </>
        }
        description="The patient-facing digital health portal is a secure, intelligent, and personalised digital home for healthcare in Africa."
        secondaryCta={{ label: 'Our Services', href: '/services' }}
        primaryCta={{ label: 'Get Started', href: 'https://portal.myvaultplus.com/register' }}
        image="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&h=1800&fit=crop&q=85"
        imageAlt="Healthcare professional with patient"
        rightCards={
          <div style={{ position: 'relative', width: 304, height: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 260, background: '#07251C', borderRadius: 24, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.52)', transform: 'rotate(-4deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 12 }}>One Portal</div>
              <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.55, fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, margin: 0 }}>Healthcare that Combines Records, Specialists and Intelligent Care.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>5,000+ Active Patients</span>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 158, left: 50, width: 232, background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.38)', transform: 'rotate(3deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>Platform at a Glance</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F7FAF7', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#07251C', fontFamily: 'var(--font-manrope), sans-serif' }}>7</div>
                  <div style={{ fontSize: 10, color: '#617870', marginTop: 2 }}>Services</div>
                </div>
                <div style={{ background: '#F7FAF7', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#07251C', fontFamily: 'var(--font-manrope), sans-serif' }}>98%</div>
                  <div style={{ fontSize: 10, color: '#617870', marginTop: 2 }}>Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Section 1 — Bento */}
      <div className="page-card" style={{ background: '#F7FAF7' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— About MyVault+</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              A digital health platform dedicated to making care{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>simpler and more accessible.</em>
            </h2>
          </div>
          <div className="about-bento">
            <div style={{ gridRow: '1 / 3', background: '#07251C', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 18 }}>One Portal</div>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>Your complete health journey, organised.</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {checkItems.map((item) => (
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
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 17, fontWeight: 700, color: '#6DC43F' }}>HHA-LAG-2606-0001</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>Patient ID · Instant on registration</div>
              </div>
            </div>
            <div style={{ gridRow: '1 / 3', background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.08)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
                <Image src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80" alt="Healthcare professional with patient" fill style={{ objectFit: 'cover' }} sizes="400px" />
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#137333', marginBottom: 8 }}>Onboard in under 3 minutes</div>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Register, access your portal, and start using Health-Hub Africa® services immediately, at no cost.</p>
              </div>
            </div>
            <div style={{ background: '#6DC43F', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A4E3C' }}>Specialist Fields</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 52, fontWeight: 700, color: '#07251C', letterSpacing: '-0.03em', lineHeight: 1 }}>18+</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A4E3C', marginTop: 6 }}>Clinical fields in Expert Review™</div>
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6DC43F' }}>Services</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 52, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>7</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Healthcare services, one portal</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2 — Layers */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Infrastructure</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Three integrated{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>layers of care.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div className="rg-3" style={{ gap: 12 }}>
              {layers.map((layer) => (
                <div key={layer.num} style={{ padding: '40px 36px 36px', background: '#fff', borderRadius: 18 }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 36, fontWeight: 700, color: '#6DC43F', letterSpacing: '-0.02em', marginBottom: 16 }}>{layer.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 21, color: '#07251C', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{layer.title}</h3>
                  <p style={{ color: '#5A7068', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{layer.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Section 3 — Pillars */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Pillars</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              What we stand{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700 }}>for.</em>
            </h2>
          </div>
          <div className="rg-2">
            {pillars.map((pillar) => (
              <div key={pillar.title} style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l2 2 4-4M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#137333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 18, color: '#07251C', margin: 0 }}>{pillar.title}</h3>
                <p style={{ color: '#41584E', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 4 — Organisation */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 18 }}>— Organisation</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 20px' }}>
                Built by{' '}
                <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, color: '#6DC43F' }}>Health-Hub Africa®</em>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, margin: '0 0 16px' }}>
                Health-Hub Africa® is an integrated healthcare technology company based in Lagos, Nigeria. We build the infrastructure that connects patients to quality care, combining clinical expertise with world-class digital product development.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                MyHealth Vault+™ is our flagship patient-facing platform, designed to give every Nigerian access to a secure, intelligent digital health home.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ label: 'Parent Organisation', value: 'Health-Hub Africa® Ltd' }, { label: 'Location', value: 'Lagos, Nigeria' }, { label: 'Registration', value: 'RC 1234567' }].map((item) => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(109,196,63,0.15)', borderRadius: 16, padding: '18px 22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
