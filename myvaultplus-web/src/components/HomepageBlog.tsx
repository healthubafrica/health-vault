'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant, slideUpCard } from '@/lib/motion'
import { formatBlogDate, FALLBACK_COVER_IMAGE, type CmsBlogPost } from '@/lib/cms'

interface HomepageBlogProps {
  posts?: CmsBlogPost[]
}

export default function HomepageBlog({ posts = [] }: HomepageBlogProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()

  const initial = reduced ? 'visible' : 'hidden'
  const animate = inView ? 'visible' : 'hidden'

  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px, 4vw, 56px)' }}>

        {/* Header row */}
        <motion.div
          ref={ref}
          variants={staggerContainer(0.12)}
          initial={initial}
          animate={animate}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 48,
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <motion.div
              variants={labelVariant}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#07251C',
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#07251C',
                  display: 'inline-block',
                }}
              />
              Blog &amp; Articles
            </motion.div>

            <motion.h2
              variants={headingVariant}
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 46px)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                margin: '0 0 14px',
                color: '#07251C',
              }}
            >
              Latest insights &amp;{' '}
              <em
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontStyle: 'italic',
                  fontWeight: 700,
                }}
              >
                trends
              </em>
            </motion.h2>

            <motion.p
              variants={bodyVariant}
              style={{ color: '#5A7068', fontSize: 15, lineHeight: 1.6, margin: 0 }}
            >
              Health news, expert guidance, and product updates — straight from Health-Hub Africa.
            </motion.p>
          </div>

          <motion.div variants={bodyVariant} style={{ flexShrink: 0 }}>
            <Link
              href="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                border: '1.5px solid #07251C',
                color: '#07251C',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '11px 11px 11px 22px',
                borderRadius: 100,
              }}
            >
              View All
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#07251C',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
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
            </Link>
          </motion.div>
        </motion.div>

        {/* Blog cards */}
        <motion.div
          variants={staggerContainer(0.14)}
          initial={initial}
          animate={animate}
          className="rg-3"
          style={{ alignItems: 'stretch' }}
        >
          {posts.map((post) => (
            <motion.div
              key={post.slug}
              variants={slideUpCard}
              whileHover={
                !reduced
                  ? { y: -8, transition: { duration: 0.2, ease: EASE_OUT } }
                  : undefined
              }
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <Link
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', flex: 1 }}
              >
                {/* Image container */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 20,
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    background: '#0a2a1c',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImageUrl ?? FALLBACK_COVER_IMAGE}
                    alt={post.title}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                    }}
                  />

                  {/* Gradient overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.80) 100%)',
                    }}
                  />

                  {/* Category chip — top left */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      left: 18,
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 100,
                      padding: '5px 14px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {post.category}
                  </div>

                  {/* Title — bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0 22px 24px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-manrope), sans-serif',
                        fontSize: 17,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: '#fff',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {post.title}
                    </p>
                  </div>
                </div>

                {/* Date below card */}
                <p
                  style={{
                    fontSize: 12,
                    color: '#8FA89A',
                    margin: '12px 0 0',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                  }}
                >
                  {formatBlogDate(post.publishedAt)}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
