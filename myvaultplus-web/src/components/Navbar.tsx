'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const services = [
  {
    name: 'TeleCare™',
    desc: 'Remote video/phone consultations',
    href: '/services/telecare',
    img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'MinuteCare™',
    desc: 'Same-day clinic fast-track',
    href: '/services/minutecare',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'CareTest™',
    desc: 'Lab tests & diagnostic bookings',
    href: '/services/caretest',
    img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'HealthConsult™',
    desc: 'Personalised preventive care',
    href: '/services/healthconsult',
    img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'Expert Review™',
    desc: 'Specialist second opinions',
    href: '/expert-review',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'DispatchCare™',
    desc: 'Emergency medical dispatch',
    href: '/dispatchcare',
    img: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=160&h=100&fit=crop&q=80',
  },
  {
    name: 'NeuroFlex™',
    desc: 'Specialist neurology service',
    href: '/services/neuroflex',
    img: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=160&h=100&fit=crop&q=80',
  },
]

const aboutLinks = [
  { label: 'Company / About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Corporate & HMO', href: '/corporate' },
]

const mobileLinks = [
  { label: 'Home', href: '/' },
  { label: 'TeleCare™', href: '/services/telecare' },
  { label: 'MinuteCare™', href: '/services/minutecare' },
  { label: 'CareTest™', href: '/services/caretest' },
  { label: 'HealthConsult™', href: '/services/healthconsult' },
  { label: 'Expert Review™', href: '/expert-review' },
  { label: 'DispatchCare™', href: '/dispatchcare' },
  { label: 'NeuroFlex™', href: '/services/neuroflex' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Corporate & HMO', href: '/corporate' },
  { label: 'Plans & Pricing', href: '/plans' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar({ forceScrolled = false }: { forceScrolled?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [megaMenu, setMegaMenu] = useState<null | 'services' | 'about'>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // forceScrolled: only dark text/logo on light-bg pages — layout stays unscrolled until real scroll
  const isDark = scrolled || forceScrolled
  const textColor = isDark ? '#07251C' : '#fff'
  const subTextColor = isDark ? '#27433A' : 'rgba(255,255,255,0.85)'

  return (
    <>
    <style>{`
      @media (min-width: 769px) { .mobile-menu-btn { display: none !important; } }
      @media (max-width: 768px) { .nav-links-desktop { display: none !important; } }
    `}</style>
    <header
      style={{
        position: 'fixed',
        top: scrolled ? 12 : 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: scrolled ? '60%' : '75%',
        zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        border: 'none',
        borderRadius: 28,
        transition: 'top 0.32s ease, background 0.32s ease, width 0.32s ease, box-shadow 0.32s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(7,37,28,0.12)' : 'none',
      }}
    >
      <nav
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <Image
            src={isDark ? '/logo.png' : '/logo-white.png'}
            alt="MyHealth Vault+ logo"
            width={140}
            height={36}
            style={{ objectFit: 'contain', height: 36, width: 'auto' }}
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <div
          className="nav-links-desktop"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {/* Home */}
          <Link
            href="/"
            style={{ color: subTextColor, textDecoration: 'none', transition: 'color 0.28s ease' }}
          >
            Home
          </Link>

          {/* Services mega menu trigger */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setMegaMenu('services')}
            onMouseLeave={() => setMegaMenu(null)}
          >
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: subTextColor,
                fontSize: 14,
                fontWeight: 500,
                transition: 'color 0.28s ease',
                fontFamily: 'inherit',
              }}
            >
              Services <span style={{ fontSize: 11, opacity: 0.8 }}>▾</span>
            </button>

            {megaMenu === 'services' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 200,
                  paddingTop: 8,
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 24px 60px rgba(7,37,28,0.18)',
                    padding: 24,
                    width: 560,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    {services.map((svc) => (
                      <Link
                        key={svc.name}
                        href={svc.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          textDecoration: 'none',
                          padding: '10px 12px',
                          borderRadius: 10,
                          transition: 'background 0.18s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = '#F1F4EF'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                        }}
                      >
                        <Image
                          src={svc.img}
                          alt={svc.name}
                          width={80}
                          height={60}
                          style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <div
                            style={{
                              fontFamily: 'var(--font-manrope), sans-serif',
                              fontWeight: 600,
                              fontSize: 13.5,
                              color: '#07251C',
                              marginBottom: 3,
                            }}
                          >
                            {svc.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#41584E', lineHeight: 1.4 }}>{svc.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: '1px solid rgba(7,37,28,0.08)',
                    }}
                  >
                    <Link
                      href="/services"
                      style={{
                        color: '#137333',
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View all services →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* About mega menu trigger */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setMegaMenu('about')}
            onMouseLeave={() => setMegaMenu(null)}
          >
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: subTextColor,
                fontSize: 14,
                fontWeight: 500,
                transition: 'color 0.28s ease',
                fontFamily: 'inherit',
              }}
            >
              About <span style={{ fontSize: 11, opacity: 0.8 }}>▾</span>
            </button>

            {megaMenu === 'about' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 200,
                  paddingTop: 8,
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 24px 60px rgba(7,37,28,0.18)',
                    padding: 20,
                    width: 220,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {aboutLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        style={{
                          display: 'block',
                          padding: '10px 12px',
                          borderRadius: 10,
                          textDecoration: 'none',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#07251C',
                          transition: 'background 0.18s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = '#F1F4EF'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                        }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Static links */}
          <Link
            href="/plans"
            style={{ color: subTextColor, textDecoration: 'none', transition: 'color 0.28s ease' }}
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            style={{ color: subTextColor, textDecoration: 'none', transition: 'color 0.28s ease' }}
          >
            Blog
          </Link>
          <Link
            href="/contact"
            style={{ color: subTextColor, textDecoration: 'none', transition: 'color 0.28s ease' }}
          >
            Contact
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="https://portal.myvaultplus.com/login"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: textColor,
              textDecoration: 'none',
              padding: '10px 6px',
              transition: 'color 0.28s ease',
            }}
          >
            Sign In
          </a>
          <a
            href="https://portal.myvaultplus.com/register"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: scrolled ? '#07251C' : '#6DC43F',
              color: scrolled ? '#fff' : '#07251C',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.04em',
              padding: '9px 9px 9px 18px',
              borderRadius: 100,
              transition: 'background 0.28s ease, color 0.28s ease',
            }}
          >
            Get Started
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: scrolled ? '#6DC43F' : '#07251C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.28s ease',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 19L19 5M19 5H9M19 5v10"
                  stroke={scrolled ? '#07251C' : '#6DC43F'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setOpen(!open)}
          style={{
            background: isDark ? 'none' : 'rgba(255,255,255,0.15)',
            border: isDark ? '1px solid rgba(7,37,28,0.15)' : '1px solid rgba(255,255,255,0.35)',
            borderRadius: 8,
            padding: '8px 10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            transition: 'background 0.28s ease, border-color 0.28s ease',
          }}
          aria-label="Toggle menu"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: i === 2 ? 14 : 20,
                height: 2,
                background: textColor,
                borderRadius: 2,
                transition: 'background 0.28s ease',
              }}
            />
          ))}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            background: isDark ? '#fff' : 'rgba(7,37,28,0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(7,37,28,0.08)',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {mobileLinks.map((l) => (
            <Link
              key={l.label + l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                color: isDark ? '#27433A' : 'rgba(255,255,255,0.88)',
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '4px 0' }} />
          <a
            href="https://portal.myvaultplus.com/register"
            style={{
              display: 'block',
              textAlign: 'center',
              background: '#6DC43F',
              color: '#07251C',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 15,
              padding: '14px',
              borderRadius: 100,
            }}
          >
            Get Started
          </a>
        </div>
      )}
    </header>
    </>
  )
}
