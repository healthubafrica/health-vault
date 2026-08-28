import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
} from 'lucide-react-native';
import {
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  VideoTrack,
  AudioSession,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

import { telecare, ApiError } from '@/lib/api';

// The room view — everything inside here has access to the LiveKit room
// context provided by <LiveKitRoom>.
function CallRoom({ onLeave }: { onLeave: () => void }) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  const remoteTrack = tracks.find((t) => isTrackReference(t) && !t.participant.isLocal);
  const localTrack = tracks.find((t) => isTrackReference(t) && t.participant.isLocal);

  return (
    <View style={styles.roomContainer}>
      {/* Remote participant fills the screen; local camera is a corner PiP —
          same layout the web TeleCare screen uses. */}
      {remoteTrack ? (
        <VideoTrack trackRef={remoteTrack} style={StyleSheet.absoluteFillObject} objectFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.waitingBox]}>
          <ActivityIndicator size="large" color="#6DC43F" />
          <Text style={styles.waitingText}>Waiting for your provider to join…</Text>
        </View>
      )}

      {localTrack && isCameraEnabled && (
        <View style={styles.pipBox}>
          <VideoTrack trackRef={localTrack} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror />
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          style={[styles.controlBtn, !isMicrophoneEnabled && styles.controlBtnOff]}>
          {isMicrophoneEnabled ? <Mic size={22} color="#FFFFFF" /> : <MicOff size={22} color="#FFFFFF" />}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          style={[styles.controlBtn, !isCameraEnabled && styles.controlBtnOff]}>
          {isCameraEnabled ? <Camera size={22} color="#FFFFFF" /> : <CameraOff size={22} color="#FFFFFF" />}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={onLeave} style={[styles.controlBtn, styles.endCallBtn]}>
          <PhoneOff size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TeleCareInCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const [callFailed, setCallFailed] = useState<string | null>(null);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['telecare-token', params.sessionId],
    queryFn: () => telecare.getToken(params.sessionId as string),
    enabled: !!params.sessionId,
    retry: false,
  });

  const handleLeave = () => {
    // Fire-and-forget, same rationale as web: a LiveKit server-side webhook
    // is the final source of truth, this just gives an instant flip.
    if (params.sessionId) telecare.markCompleted(params.sessionId).catch(() => null);
    router.replace('/(tabs)/telecare');
  };

  if (!params.sessionId) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.errorText}>No session specified.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#6DC43F" />
        <Text style={styles.waitingText}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data?.token) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.errorText}>
          {error instanceof ApiError ? error.message : "We couldn't set up your call. Please try again."}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (callFailed) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.errorText}>{callFailed}</Text>
        <Text style={styles.errorSubText}>
          Please allow camera and microphone access for this app in your device settings, then try again.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <LiveKitRoom
        serverUrl={data.serverUrl}
        token={data.token}
        connect
        audio
        video
        onConnected={() => setHasConnected(true)}
        onError={(err) => setCallFailed(err.message)}
        onDisconnected={() => {
          // Only a call that actually connected counts as a real, completed
          // session — a connect failure firing this immediately must not
          // silently mark the appointment done.
          if (hasConnected) handleLeave();
          else setCallFailed('The call ended before it connected.');
        }}>
        <CallRoom onLeave={handleLeave} />
      </LiveKitRoom>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  roomContainer: {
    flex: 1,
    backgroundColor: '#0a1a0a',
  },
  waitingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0a1a0a',
  },
  waitingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 8,
    padding: 10,
  },
  backLinkText: {
    color: '#6DC43F',
    fontSize: 14,
    fontWeight: '700',
  },
  pipBox: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 96,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnOff: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  endCallBtn: {
    backgroundColor: '#C0392B',
  },
});
