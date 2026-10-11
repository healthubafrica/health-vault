'use client'

import React, { useEffect, useRef, useState } from 'react'
import { EMPTY_ART, type EmptyArtKey } from '@/lib/emptyArt'

interface EmptyArtProps {
  name: EmptyArtKey
  size?: number
}

/** Decorative artwork: hidden from screen readers, still frame under "reduce motion". */
export function EmptyArt({ name, size = 160 }: EmptyArtProps) {
  const art = EMPTY_ART[name]
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (art.kind !== 'lottie' || !host.current) return
    let alive = true
    let destroy: (() => void) | undefined
    const el = host.current
    Promise.all([import('lottie-web'), fetch(art.src).then((r) => (r.ok ? r.json() : null))])
      .then(([lottie, data]) => {
        if (!alive || !data) return
        const anim = lottie.default.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: !reduceMotion,
          autoplay: !reduceMotion,
          animationData: data,
        })
        // Reduced motion: hold a mid frame instead of playing.
        if (reduceMotion) anim.goToAndStop(Math.floor(anim.totalFrames / 2), true)
        destroy = () => anim.destroy()
      })
      .catch(() => undefined)
    return () => {
      alive = false
      destroy?.()
    }
  }, [art, reduceMotion])

  const box = { width: size, height: size }

  if (art.kind === 'webp') {
    return (
      <picture aria-hidden="true" data-testid={`empty-art-${name}`}>
        <source media="(prefers-reduced-motion: reduce)" srcSet={art.still} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={`object-contain ${art.mono ? 'empty-art-mono' : ''}`}
        />
      </picture>
    )
  }

  return <div ref={host} aria-hidden="true" style={box} data-testid={`empty-art-${name}`} />
}
