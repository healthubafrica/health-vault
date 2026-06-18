import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'

const reviewTypes = [
  { title: 'Second Opinions', desc: 'Independent expert assessment of any diagnosis from your primary physician.' },
  { title: 'Multi-Specialist Panels', desc: 'Cases reviewed by two or more specialists across relevant fields.' },
  { title: 'Lab & Imaging Reviews', desc: 'Expert interpretation of lab results, MRI, CT, X-ray, and ultrasound reports.' },
  { title: 'Post-Discharge Reviews', desc: 'Clinical review of hospital discharge summaries and follow-up care plans.' },
  { title: 'Treatment Plan Reviews', desc: 'Independent assessment of proposed treatments, surgeries, or therapies.' },
  { title: 'Medication Reviews', desc: 'Specialist review of prescribed medication regimens for safety and efficacy.' },
  { title: 'Specialist Referral Reviews', desc: 'Review of referral letters and specialist recommendations before you proceed.' },
]

const processSteps = [
  { num: '01', title: 'Submit Your Case', desc: 'Log in to your Vault, navigate to Expert Review™, and complete the case submission form with your query and relevant background.' },
  { num: '02', title: 'Upload Documents', desc: 'Upload your medical documents: lab results, imaging reports, consultation notes, prescriptions, or any relevant files.' },
  { num: '03', title: 'Under Review', desc: 'Your case is assigned to the appropriate specialist panel based on the clinical specialty required.' },
  { num: '04', title: 'Specialist Assigned', desc: 'A qualified specialist (or panel) accepts your case and begins a thorough clinical review of all submitted materials.' },
  { num: '05', title: 'Report Ready', desc: 'Your comprehensive Expert Review™ report is delivered as a PDF directly to your Vault, typically within 5–10 business days.' },
]

const specialties = [
  'Cardiology', 'Oncology', 'Neurology', 'Orthopaedics', 'Radiology', 'Dermatology',
  'Gastroenterology', 'Endocrinology', 'Paediatrics', 'Psychiatry', 'Gynaecology',
  'Pulmonology', 'Nephrology', 'Haematology', 'Urology', 'Ophthalmology', 'ENT',
]

const pricing = [
  { type: 'Single Specialist Review', price: '₦75,000 – ₦150,000' },
  { type: 'Multi-Specialist Panel', price: '₦250,000 – ₦500,000' },
  { type: 'Priority Review', price: '₦200,000 – ₦750,000' },
  { type: 'International Specialist', price: '₦500,000 – ₦2,000,000+' },
]

const bentoCheckItems = [
  'Submit case documents securely online',
  'Assigned to qualified specialist panel',
  'Real-time status updates in your Vault',
  'Comprehensive PDF report delivered',
  'All 18+ specialist fields covered',
]

export default function ExpertReviewPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1920&h=1080&fit=crop&q=85" alt="Medical specialist review" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>A Second Opinion</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.06 }}>Changes Everything.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Expert Review™ connects you with a panel of qualified specialists for second opinions on any diagnosis, treatment plan, or lab result.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Submit a Case
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — Bento */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#F7FAF7' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Expert Review™</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              When you need more than{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>one opinion.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 380 }}>
            <div style={{ gridRow: '1 / 3', background: '#07251C', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 18 }}>How It Works</div>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: '#fff', margin: '0 0 20px' }}>From submission to specialist report in 5–10 days.</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bentoCheckItems.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(52,224,160,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" /></svg>
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(52,224,160,0.08)', border: '1px solid rgba(52,224,160,0.2)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Available on <span style={{ color: '#34E0A0', fontWeight: 700 }}>all plans</span> · Pay-per-use on Free</div>
              </div>
            </div>
            <div style={{ gridRow: '1 / 3', background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.08)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
                <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop&q=80" alt="Specialist reviewing patient case" fill style={{ objectFit: 'cover' }} sizes="400px" />
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 8 }}>Clinical panel review</div>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Every case is reviewed by qualified, practising specialists, not algorithms.</p>
              </div>
            </div>
            <div style={{ background: '#34E0A0', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A4E3C' }}>Specialist Fields</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 52, fontWeight: 700, color: '#07251C', letterSpacing: '-0.03em', lineHeight: 1 }}>18+</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A4E3C', marginTop: 6 }}>Clinical specialties covered</div>
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34E0A0' }}>Turnaround</div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>5–10</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Business days</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2 — 7 types */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Review Types</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Seven kinds of{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>expert review.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {reviewTypes.map((type) => (
                <div key={type.title} style={{ padding: '32px 32px 28px', background: '#fff', borderRadius: 18 }}>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 18, color: '#07251C', margin: '0 0 10px' }}>{type.title}</h3>
                  <p style={{ color: '#5A7068', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{type.desc}</p>
                </div>
              ))}
              <div style={{ padding: '32px 32px 28px', background: '#F7FAF7', borderRadius: 18, border: '1px dashed rgba(7,37,28,0.15)' }}>
                <p style={{ color: '#7A8C84', fontSize: 14, lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>More review types available on request. Contact us to discuss your specific clinical needs.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3 — 5-step dark process */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 18 }}>— Process</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640, color: '#fff' }}>
              How Expert Review™{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, color: '#34E0A0' }}>works.</em>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {processSteps.map((step) => (
              <div key={step.num} style={{ background: '#0C3328', borderRadius: 18, padding: '24px 32px', display: 'grid', gridTemplateColumns: '64px 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 32, fontWeight: 700, color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1 }}>{step.num}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {['Submitted', 'Documents Uploaded', 'Under Review', 'Specialist Assigned', 'Report Ready'].map((status, i) => (
              <span key={status} style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 100, background: i === 4 ? '#34E0A0' : 'rgba(52,224,160,0.12)', color: i === 4 ? '#07251C' : '#34E0A0', border: i === 4 ? 'none' : '1px solid rgba(52,224,160,0.25)' }}>{status}</span>
            ))}
          </div>
        </section>
      </div>

      {/* Section 4 — Fields + Pricing */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Specialist Fields</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
                18+ clinical specialties
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {specialties.map((s) => (
                  <span key={s} style={{ fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 100, background: '#EAF7F1', color: '#0E8567', border: '1px solid rgba(14,133,103,0.2)' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
                Pay-per-review pricing
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pricing.map((p) => (
                  <div key={p.type} style={{ background: '#fff', border: '1.5px solid #D4D4D4', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 15, color: '#07251C' }}>{p.type}</div>
                    <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15, color: '#0E8567', whiteSpace: 'nowrap', marginLeft: 16 }}>{p.price}</div>
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
