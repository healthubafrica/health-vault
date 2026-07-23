'use client'

import { useEffect, useRef } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { BackgroundProcessor, type BackgroundProcessorWrapper } from '@livekit/track-processors'

/**
 * Renders nothing — applies/removes a background-blur processor on the
 * local camera track. Must be rendered as a child of <LiveKitRoom> (needs
 * the room context `useLocalParticipant` reads from).
 */
export function BackgroundBlurEffect({ enabled }: { enabled: boolean }) {
  const { localParticipant } = useLocalParticipant()
  const processorRef = useRef<BackgroundProcessorWrapper | null>(null)

  useEffect(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera)
    const track = pub?.track
    if (!track) return

    let cancelled = false
    async function apply() {
      try {
        if (enabled) {
          if (!processorRef.current) {
            processorRef.current = BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 })
          }
          if (!cancelled) await track!.setProcessor(processorRef.current)
        } else if (processorRef.current) {
          if (!cancelled) await track!.stopProcessor()
        }
      } catch {
        // Unsupported browser or track swap mid-flight — silently skip;
        // this is a nice-to-have, not something worth surfacing an error for.
      }
    }
    void apply()

    return () => { cancelled = true }
  }, [enabled, localParticipant])

  return null
}
