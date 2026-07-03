'use client'

import '@livekit/components-styles'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import type { ProviderSession, LiveKitJoinInfo } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { PhoneOff, ExternalLink } from 'lucide-react'
import { calcAge, buildOpenEmrUrl } from './helpers'

export function CallOverlay({
  session,
  callInfo,
  audioOnly,
  onLeave,
}: {
  session: ProviderSession
  callInfo: LiveKitJoinInfo
  audioOnly: boolean
  onLeave: () => void
}) {
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
          onClick={onLeave}
          className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          Leave Call
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <LiveKitRoom
          token={callInfo.token}
          serverUrl={callInfo.serverUrl}
          connect
          video={!audioOnly}
          audio
          onDisconnected={onLeave}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  )
}
