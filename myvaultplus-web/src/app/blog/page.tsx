import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { fetchBlogPosts, formatBlogDate, FALLBACK_COVER_IMAGE } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'Blog & Articles — MyHealth Vault+™',
  description:
    'Latest insights on digital health, telemedicine, expert specialist opinions, and preventive care in Nigeria and West Africa.',
}

export default async function BlogPage() {
  const { data: posts } = await fetchBlogPosts({ limit: 13 })
  const [featured, ...recent] = posts

  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* ── Dark header ── */}
      <div className="blog-header">
        <section
          style={{
            position: 'relative',
            background: '#041E14',
            overflow: 'hidden',
            padding: '140px 56px 72px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=800&fit=crop&q=80"
            alt="Health insights"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              opacity: 0.22,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, rgba(4,30,20,0.92) 0%, rgba(7,37,28,0.8) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#6DC43F',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#6DC43F',
                }}
              >
                Blog and Articles
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 32,
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(32px, 4.5vw, 58px)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.06,
                  color: '#fff',
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                Latest insights and trends
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 14.5,
                  lineHeight: 1.7,
                  maxWidth: 340,
                  margin: 0,
                }}
              >
                Whether you&apos;re optimising your health today or building for tomorrow, we help
                you move faster with confidence.
              </p>
            </div>
          </div>
        </section>
      </div>

      {!featured ? (
        <div className="blog-mid" style={{ background: '#fff', padding: '88px 56px', textAlign: 'center' }}>
          <p style={{ color: '#5A7068', fontSize: 15 }}>No articles published yet. Check back soon.</p>
        </div>
      ) : (
        <>
          {/* ── Featured post ── */}
          <div className="blog-mid" style={{ background: '#fff' }}>
            <div
              className="blog-featured-inner rg-2"
              style={{ gap: 56, alignItems: 'center' }}
            >
              {/* Image */}
              <Link
                href={`/blog/${featured.slug}`}
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4/3',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.coverImageUrl ?? FALLBACK_COVER_IMAGE}
                  alt={featured.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Link>

              {/* Content */}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#137333',
                    marginBottom: 16,
                    letterSpacing: '0.04em',
                  }}
                >
                  {formatBlogDate(featured.publishedAt)}
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-manrope), sans-serif',
                    fontWeight: 600,
                    fontSize: 'clamp(22px, 2.4vw, 34px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    color: '#07251C',
                    margin: '0 0 18px',
                  }}
                >
                  {featured.title}
                </h2>
                <p
                  style={{
                    color: '#41584E',
                    fontSize: 15,
                    lineHeight: 1.72,
                    margin: '0 0 36px',
                  }}
                >
                  {featured.excerpt}
                </p>
                <Link
                  href={`/blog/${featured.slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#07251C',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    padding: '12px 12px 12px 24px',
                    borderRadius: 100,
                  }}
                >
                  Learn More
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#6DC43F',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 19L19 5M19 5H9M19 5v10"
                        stroke="#07251C"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Recent posts grid ── */}
          {recent.length > 0 && (
            <div className="blog-footer" style={{ background: '#F7FAF7' }}>
              <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 56px 88px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#07251C',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#07251C',
                    }}
                  >
                    Published
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: 32,
                    marginBottom: 48,
                    flexWrap: 'wrap',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-manrope), sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(28px, 3.5vw, 44px)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.08,
                      color: '#07251C',
                      margin: 0,
                    }}
                  >
                    Recent published
                  </h2>
                  <p
                    style={{
                      color: '#41584E',
                      fontSize: 14,
                      lineHeight: 1.65,
                      maxWidth: 320,
                      margin: 0,
                    }}
                  >
                    Whether you&apos;re optimising your health today or building for tomorrow, we help
                    you move faster with confidence.
                  </p>
                </div>

                <div className="rg-3" style={{ gap: 28 }}>
                  {recent.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      {/* Image with arrow */}
                      <div
                        style={{
                          position: 'relative',
                          borderRadius: 16,
                          overflow: 'hidden',
                          aspectRatio: '4/3',
                          marginBottom: 18,
                          background: '#E8EDE8',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.coverImageUrl ?? FALLBACK_COVER_IMAGE}
                          alt={post.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Arrow badge */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 14,
                            right: 14,
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#6DC43F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 19L19 5M19 5H9M19 5v10"
                              stroke="#07251C"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12.5,
                          color: '#41584E',
                          marginBottom: 9,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {formatBlogDate(post.publishedAt)}
                      </div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-manrope), sans-serif',
                          fontWeight: 600,
                          fontSize: 16.5,
                          color: '#07251C',
                          margin: 0,
                          lineHeight: 1.4,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {post.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      <Footer />
    </div>
  )
}
