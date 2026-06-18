import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroSplit from '@/components/HeroSplit'

const sections = [
  {
    id: 'who-we-are',
    label: 'Who We Are',
    content: `Health-Hub Africa® Limited ("Health-Hub Africa®", "we", "us", or "our") is the data controller responsible for your personal health data collected through MyHealth Vault+™. We are registered in Nigeria and committed to protecting your privacy in accordance with the Nigeria Data Protection Regulation (NDPR) 2019 and all applicable laws.

Our registered address is in Lagos, Nigeria. For all privacy-related inquiries, contact our Data Protection Officer at: dpo@myvaultplus.com.`,
  },
  {
    id: 'data-collected',
    label: 'What Data We Collect',
    content: `We collect the following categories of personal data when you use MyHealth Vault+™:

• Identity data: full name, date of birth, gender, profile photo
• Contact data: email address, phone number, residential address
• Health data: medical records, lab results, diagnoses, medications, consultation notes, imaging reports, and any documents you upload
• Account data: username, password (encrypted), subscription plan, payment information
• Usage data: log files, IP address, device type, browser, and usage patterns within the platform
• Location data: GPS coordinates (only when you activate DispatchCare™)

Health data is classified as sensitive personal data under the NDPR and is afforded the highest level of protection.`,
  },
  {
    id: 'how-we-use',
    label: 'How We Use Your Data',
    content: `We use your personal data only for the following purposes:

• Providing and improving the MyHealth Vault+™ platform and its services
• Enabling TeleCare™ consultations, Expert Review™ submissions, DispatchCare™ activations, and other services
• Processing payments and managing your subscription
• Communicating with you about your account, bookings, and service updates
• Complying with legal and regulatory obligations
• Detecting and preventing fraud or unauthorised access

We do not sell your personal data to third parties. We do not use your health data for advertising or profiling purposes.`,
  },
  {
    id: 'storage-security',
    label: 'Data Storage & Security',
    content: `Your data is stored on secure, encrypted servers. We implement the following security measures:

• End-to-end encryption for all data in transit (TLS 1.3)
• AES-256 encryption for data at rest
• Role-based access controls — only authorised personnel can access your data
• Regular security audits and penetration testing
• Automated intrusion detection and monitoring

Your health records are stored in Nigeria (primary) with encrypted backups. We retain your data for as long as your account remains active. You may request deletion of your account and associated data at any time.`,
  },
  {
    id: 'data-sharing',
    label: 'Data Sharing',
    content: `We share your data only in the following circumstances:

• With clinicians, specialists, or facilities you explicitly authorise through the platform
• With Expert Review™ panel specialists to fulfil your review request
• With payment processors to handle transactions (they receive only what is necessary)
• With trusted technology partners who support platform operations (under strict data processing agreements)
• When required by Nigerian law, court order, or regulatory authority

We do not share your health data with employers, insurers, or third parties without your explicit consent.`,
  },
  {
    id: 'your-rights',
    label: 'Your Rights',
    content: `Under the NDPR 2019, you have the following rights regarding your personal data:

• Right of access: request a copy of the personal data we hold about you
• Right to rectification: request correction of inaccurate or incomplete data
• Right to erasure: request deletion of your personal data (subject to legal obligations)
• Right to restriction: request we limit processing of your data
• Right to data portability: receive your data in a structured, machine-readable format
• Right to object: object to processing based on legitimate interests
• Right to withdraw consent: for consent-based processing, withdraw consent at any time

To exercise any of these rights, contact us at: privacy@myvaultplus.com or write to our DPO at our registered Lagos address.`,
  },
  {
    id: 'cookies',
    label: 'Cookies',
    content: `MyHealth Vault+™ uses cookies and similar tracking technologies to:

• Keep you signed in to your account (session cookies — essential)
• Remember your preferences (functional cookies)
• Analyse platform usage to improve our services (analytics cookies)

You can control cookie settings through your browser settings. Essential cookies cannot be disabled as they are required for the platform to function. You will be asked for consent before any non-essential cookies are set.`,
  },
  {
    id: 'contact',
    label: 'Contact Us',
    content: `For any privacy-related questions, requests, or complaints, contact us:

Data Protection Officer: dpo@myvaultplus.com
Privacy Team: privacy@myvaultplus.com
Address: Health-Hub Africa® Limited, Lagos, Nigeria

If you are dissatisfied with our response, you have the right to lodge a complaint with the Nigeria Data Protection Bureau (NDPB).`,
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar forceScrolled />
      <div style={{ height: 80 }} />

      <HeroSplit
        trustText="NDPR 2019 Compliant · AES-256 Encrypted"
        heading={
          <>
            <span style={{ display: 'block' }}>Your Privacy.</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#0E8567' }}>Our Commitment.</span>
          </>
        }
        description="How we collect, use, and protect your personal health data at MyHealth Vault+™."
        secondaryCta={{ label: 'View Terms', href: '/terms' }}
        primaryCta={{ label: 'Contact Us', href: '/contact' }}
        image="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1400&h=1800&fit=crop&q=85"
        imageAlt="Data privacy and security"
        rightCards={
          <div style={{ position: 'relative', width: 304, height: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 260, background: '#07251C', borderRadius: 24, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.52)', transform: 'rotate(-4deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 12 }}>Data Security</div>
              <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.55, fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, margin: 0 }}>AES-256 Encryption at Rest · TLS 1.3 in Transit.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#34E0A0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>End-to-end protected</span>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 158, left: 50, width: 232, background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.38)', transform: 'rotate(3deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>Your Rights (NDPR)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Access', 'Rectify', 'Erase', 'Port'].map((right) => (
                  <div key={right} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34E0A0', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#27433A' }}>Right to {right}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0F2EF', fontSize: 10, color: '#617870' }}>NDPR 2019 · GDPR-aligned</div>
            </div>
          </div>
        }
      />

      {/* Privacy prose */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 820, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 12 }}>
                  — {section.label}
                </div>
                <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                  {section.label}
                </h2>
                {section.content.split('\n\n').map((para, idx) => (
                  <p key={idx} style={{ color: '#41584E', fontSize: 15, lineHeight: 1.75, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{para}</p>
                ))}
              </div>
            ))}
          </div>
          <p style={{ color: '#7A8C84', fontSize: 13, marginTop: 64 }}>Last updated: June 2026</p>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
