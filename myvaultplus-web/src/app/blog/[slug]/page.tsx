import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPostBySlug, getRelatedPosts, getAllSlugs } from '@/lib/blog'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} — MyHealth Vault+™`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.image }],
      type: 'article',
      publishedTime: post.dateISO,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const related = getRelatedPosts(post.slug, 3)

  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* ── Article header (dark) ── */}
      <div style={{ margin: '16px 16px 0', borderRadius: '28px 28px 0 0', overflow: 'hidden' }}>
        <section
          style={{
            position: 'relative',
            background: '#041E14',
            overflow: 'hidden',
            padding: '140px 0 72px',
          }}
        >
          <Image
            src={post.image}
            alt={post.title}
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.18 }}
            sizes="100vw"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, rgba(4,30,20,0.95) 0%, rgba(7,37,28,0.88) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: 760,
              margin: '0 auto',
              padding: '0 40px',
            }}
          >
            {/* Breadcrumb */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/blog"
                style={{
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Blog
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>›</span>
              <span
                style={{
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                }}
              >
                {post.category}
              </span>
            </div>

            {/* Date */}
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
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#6DC43F',
                }}
              >
                {post.date}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 48px)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: '#fff',
                margin: '0 0 24px',
              }}
            >
              {post.title}
            </h1>

            {/* Intro excerpt */}
            <p
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: 16,
                lineHeight: 1.72,
                margin: 0,
              }}
            >
              {post.excerpt}
            </p>
          </div>
        </section>
      </div>

      {/* ── Hero image ── */}
      <div style={{ margin: '0 16px', background: '#fff' }}>
        <div
          style={{
            maxWidth: 1060,
            margin: '0 auto',
            padding: '56px 40px',
          }}
        >
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              aspectRatio: '16/9',
            }}
          >
            <Image
              src={post.image}
              alt={post.title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1100px) 100vw, 1060px"
            />
          </div>
        </div>
      </div>

      {/* ── Article body ── */}
      <div style={{ margin: '0 16px 0', background: '#fff' }}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 40px 88px',
          }}
        >
          {post.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: i < post.sections.length - 1 ? 48 : 0 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(18px, 2vw, 24px)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.25,
                  color: '#07251C',
                  margin: '0 0 14px',
                }}
              >
                {section.heading}
              </h2>
              <p
                style={{
                  color: '#41584E',
                  fontSize: 15.5,
                  lineHeight: 1.78,
                  margin: 0,
                }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Related articles ── */}
      <div
        style={{
          margin: '0 16px 24px',
          borderRadius: '0 0 28px 28px',
          overflow: 'hidden',
          background: '#07251C',
        }}
      >
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 56px 88px' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
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
              alignItems: 'center',
              gap: 24,
              marginBottom: 48,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 600,
                fontSize: 'clamp(24px, 3vw, 40px)',
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                color: '#fff',
                margin: 0,
              }}
            >
              Latest insights and trends
            </h2>
            <Link
              href="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '11px 11px 11px 20px',
                borderRadius: 100,
                flexShrink: 0,
              }}
            >
              View All
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#6DC43F',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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

          {/* 3-card grid with image + text overlay */}
          <div className="rg-3">
            {related.map((rPost) => (
              <Link
                key={rPost.slug}
                href={`/blog/${rPost.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 18,
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                  }}
                >
                  <Image
                    src={rPost.image}
                    alt={rPost.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {/* Dark gradient overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to top, rgba(4,18,12,0.92) 0%, rgba(4,18,12,0.4) 50%, rgba(4,18,12,0.05) 100%)',
                    }}
                  />
                  {/* Text at bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '24px 22px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.55)',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        marginBottom: 8,
                      }}
                    >
                      {rPost.date}
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-manrope), sans-serif',
                        fontWeight: 600,
                        fontSize: 16,
                        color: '#fff',
                        margin: 0,
                        lineHeight: 1.4,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {rPost.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
