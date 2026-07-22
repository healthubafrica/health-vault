'use client'

import '@livekit/components-styles'
import { useRef, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import type { ProviderSession, LiveKitJoinInfo } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { PhoneOff, ExternalLink, AlertCircle } from 'lucide-react'
import { calcAge, buildOpenEmrUrl } from './helpers'

export function CallOverlay({
  session,
  callInfo,
  audioOnly,
  onLeave,
  onClose,
}: {
  session: ProviderSession
  callInfo: LiveKitJoinInfo
  audioOnly: boolean
  /** Provider hung up a call that actually connected — completes the session. */
  onLeave: () => void
  /** Call never connected — dismiss without completing the session. */
  onClose: () => void
}) {
  // A disconnect only means "the call ended" if we ever actually connected.
  // Without this, a failed connection fires onDisconnected immediately and
  // completes the session, dropping the provider into the Encounter notes.
  const hasConnected = useRef(false)
  const [failure, setFailure] = useState<string | null>(
    callInfo.serverUrl ? null : 'Video calling is not configured on the server.',
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: '#222', background: '#111' }}
      >
        <div className="flex items-center gap-3">
          {session.patient?.profilePhotoUrl && (
            <img
              src={session.patient.profilePhotoUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">
              {session.patient
                ? `${session.patient.firstName} ${session.patient.lastName}`
                : session.hhaRef}
            </p>
            {session.patient?.openemrPatientUuid && (
              <a
                href={buildOpenEmrUrl(session.patient.openemrPatientUuid)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open patient chart in OpenEMR"
                className="inline-flex items-center rounded p-0.5 hover:bg-white/10 transition-colors"
                style={{ color: '#9ca3af' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <span>{session.hhaRef}</span>
            {session.patient?.dateOfBirth && (
              <span>· {calcAge(session.patient.dateOfBirth)}</span>
            )}
            {session.patient?.gender && (
              <span className="capitalize">· {session.patient.gender.toLowerCase()}</span>
            )}
            {session.patient?.subscriptions?.[0]?.plan?.name && (
              <span>· {session.patient.subscriptions[0].plan.name}</span>
            )}
          </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={failure ? onClose : onLeave}
          className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          {failure ? 'Close' : 'Leave Call'}
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {failure ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="w-8 h-8" style={{ color: '#f87171' }} />
            <p className="text-sm font-semibold text-white">Couldn&apos;t connect to the call</p>
            <p className="text-xs max-w-sm" style={{ color: '#9ca3af' }}>{failure}</p>
            <p className="text-xs max-w-sm" style={{ color: '#6b7280' }}>
              Check that camera and microphone access is allowed for this site, then try joining again.
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Back to sessions
            </Button>
          </div>
        ) : (
          <LiveKitRoom
            token={callInfo.token}
            serverUrl={callInfo.serverUrl}
            connect
            video={!audioOnly}
            audio
            onConnected={() => { hasConnected.current = true }}
            onError={(err) => setFailure(err.message)}
            onDisconnected={() => {
              // Only treat this as a completed consultation if the call was
              // ever live; otherwise it's a failed connect, not a hang-up.
              if (hasConnected.current) onLeave()
              else setFailure('The call ended before it connected.')
            }}
          >
            <VideoConference />
          </LiveKitRoom>
        )}
      </div>
    </div>
  )
}
