'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { EMPTY_ART, type EmptyArtKey } from '@/lib/emptyArt'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface EmptyArtProps {
  name: EmptyArtKey
  size?: number
}

/** Decorative artwork: hidden from screen readers, still frame under "reduce motion". */
export function EmptyArt({ name, size = 160 }: EmptyArtProps) {
  const art = EMPTY_ART[name]
  const [data, setData] = useState<object | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (art.kind !== 'lottie') return
    let alive = true
    fetch(art.src)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setData(j))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [art])

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

  return (
    <div aria-hidden="true" style={box} data-testid={`empty-art-${name}`}>
      {data ? <Lottie animationData={data} loop={!reduceMotion} autoplay={!reduceMotion} style={box} /> : null}
    </div>
  )
}
