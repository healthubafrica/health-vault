'use client'

import { useEffect, useRef } from 'react'
import { impression } from '@/lib/analytics/client'

interface TrackImpressionProps {
  elementId: string
  featureArea?: string
  elementType?: string
  children: React.ReactNode
}

// Fires one cta_impression event the first time this element becomes at
// least half visible for a sustained beat — long enough to count as "seen"
// rather than scrolled past, short enough not to miss a quick glance.
// Spec §8.3: CTA impressions are the CTR denominator, so this has to be a
// real visibility signal, not "the component mounted".
const VISIBILITY_THRESHOLD = 0.5
const SUSTAINED_VISIBLE_MS = 500

export function TrackImpression({ elementId, featureArea, elementType, children }: TrackImpressionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node || firedRef.current) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firedRef.current) return

        if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
          timer = setTimeout(() => {
            if (firedRef.current) return
            firedRef.current = true
            impression(elementId, { featureArea, elementType })
            observer.disconnect()
          }, SUSTAINED_VISIBLE_MS)
        } else if (timer) {
          clearTimeout(timer)
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [elementId, featureArea, elementType])

  return <div ref={ref}>{children}</div>
}
