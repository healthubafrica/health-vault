'use client'

import { useRemoteParticipants } from '@livekit/components-react'
import { Users } from 'lucide-react'

/**
 * Surfaces caregiver/family guests in the call — their LiveKit identity is
 * always prefixed `guest-` (see GuestInviteService.verifyOtp on the API),
 * so this is a simple identity check rather than a custom tile layout.
 * Renders nothing when no guest is present.
 */
export function GuestParticipantsBanner() {
  const participants = useRemoteParticipants()
  const guests = participants.filter((p) => p.identity.startsWith('guest-'))

  if (guests.length === 0) return null

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: 'rgba(109,196,63,0.18)', color: '#6DC43F' }}
      title={guests.map((g) => g.name || 'Guest').join(', ')}
    >
      <Users className="w-3.5 h-3.5" />
      {guests.length === 1 ? `Guest: ${guests[0].name || 'Guest'}` : `${guests.length} guests in call`}
    </div>
  )
}
