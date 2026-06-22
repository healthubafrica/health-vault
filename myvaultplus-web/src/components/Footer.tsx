'use client'

import { useState } from 'react'
import Link from 'next/link'

const navCols = [
  {
    heading: 'Platform',
    links: [
      { label: 'Patient Portal', href: 'https://portal.myvaultplus.com' },
      { label: 'Clinical Platform', href: 'https://clinical.myvaultplus.com' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { label: 'TeleCare™', href: '/services' },
      { label: 'MinuteCare™', href: '/services' },
      { label: 'CareTest™', href: '/services' },
      { label: 'Expert Review™', href: '/expert-review' },
      { label: 'DispatchCare™', href: '/dispatchcare' },
      { label: 'HealthConsult™', href: '/services' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Plans & Pricing', href: '/plans' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Careers (soon)', href: '#', muted: true },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Cookie Policy', href: '/privacy' },
      { label: 'WhatsApp Support', href: '/contact' },
      { label: 'Call Support', href: '/contact' },
    ],
  },
]

export default function Footer() {
  const [email, setEmail] = useState('')

  return (
    /* ── Same card treatment as FinalCTA: margin:24px on all sides, borderRadius:28 ── */
    <footer
      className="page-card"
      style={{
        background: '#0C0C0C',
        color: '#fff',
      }}
    >
      {/* ── Main grid ── */}
      <div
        className="footer-grid"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '64px 56px 0',
          alignItems: 'start',
        }}
      >
        {/* ── Brand + newsletter ── */}
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: '#137333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                  stroke="#6DC43F"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8.5v5M9.5 11h5"
                  stroke="#6DC43F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              MyHealth Vault+
            </span>
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13.5,
              lineHeight: 1.65,
              margin: '0 0 28px',
              maxWidth: 280,
            }}
          >
            Easily adapt to changes and scale your healthcare access with our flexible
            infrastructure, designed to support your wellbeing.
          </p>

          {/* Newsletter */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.38)',
              margin: '0 0 10px',
            }}
          >
            Subscribe to our newsletter
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setEmail('')
            }}
            style={{ display: 'flex', gap: 0 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRight: 'none',
                borderRadius: '100px 0 0 100px',
                padding: '11px 18px',
                color: '#fff',
                fontSize: 13.5,
                outline: 'none',
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#6DC43F',
                color: '#07251C',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                border: 'none',
                padding: '11px 10px 11px 18px',
                borderRadius: '0 100px 100px 0',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Submit
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#07251C',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 19L19 5M19 5H9M19 5v10"
                    stroke="#6DC43F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </form>
        </div>

        {/* ── Nav columns ── */}
        {navCols.map((col) => (
          <div key={col.heading}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 18,
              }}
            >
              {col.heading}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, fontSize: 14 }}>
              {col.links.map((link) =>
                link.href.startsWith('http') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: (link as { muted?: boolean }).muted
                        ? 'rgba(255,255,255,0.22)'
                        : 'rgba(255,255,255,0.62)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    style={{
                      color: (link as { muted?: boolean }).muted
                        ? 'rgba(255,255,255,0.22)'
                        : 'rgba(255,255,255,0.62)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          maxWidth: 1280,
          margin: '56px auto 0',
          padding: '22px 56px 40px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12.5, margin: 0 }}>
          © 2026 Health-Hub Africa®. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
